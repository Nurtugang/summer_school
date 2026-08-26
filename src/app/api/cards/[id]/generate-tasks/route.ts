import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { flagCheatableTasks, generateTaskSet, GeminiResponseError } from "@/lib/gemini";
import type { TaskSetJson, TaskSetRow, CheatFlag } from "@/lib/gemini";
import { changedOrRespondedToPrompt, normalizeTaskSet } from "@/lib/taskSetFlow";

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof GeminiResponseError) {
      return await fn();
    }
    throw err;
  }
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const card = await prisma.card.findUnique({ where: { id } });
  if (!card || card.userId !== session.user.id || card.kind !== "task_set") {
    return NextResponse.json({ error: "Комплект не найден" }, { status: 404 });
  }
  if (card.status !== "draft") {
    return NextResponse.json({ error: "Комплект уже отправлен" }, { status: 400 });
  }

  const current = normalizeTaskSet(card.cardJson);
  if (current.promptChallenges.length === 0) {
    return NextResponse.json({ error: "Сначала пройдите «Проверку промпта»" }, { status: 400 });
  }
  if (!changedOrRespondedToPrompt(current.promptCheckedSnapshot, current.pentagram, current.promptResponses)) {
    return NextResponse.json(
      { error: "После проверки промпта измените поле или ответьте на все вопросы" },
      { status: 400 }
    );
  }

  let rows: TaskSetRow[];
  let flags: CheatFlag[];
  try {
    rows = await withRetry(() => generateTaskSet(current.pentagram));
    flags = await withRetry(() => flagCheatableTasks(rows, current.pentagram));
  } catch {
    return NextResponse.json(
      { error: "Не удалось получить комплект заданий от Gemini. Попробуйте ещё раз." },
      { status: 502 }
    );
  }

  const updated: TaskSetJson = {
    ...current,
    rows,
    flags,
    recheckFlags: null,
    generated: true,
  };

  await prisma.card.update({
    where: { id },
    data: {
      cardJson: updated as unknown as Prisma.InputJsonValue,
      draftJson: updated as unknown as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({ rows, flags });
}
