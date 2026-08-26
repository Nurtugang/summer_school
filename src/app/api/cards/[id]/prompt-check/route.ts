import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPentagramPrompt, GeminiResponseError } from "@/lib/gemini";
import type { TaskSetJson } from "@/lib/gemini";
import { normalizeTaskSet, pentagramFieldsFilled } from "@/lib/taskSetFlow";

const pentagramSchema = z.object({
  persona: z.string(),
  context: z.string(),
  task: z.string(),
  output: z.string(),
  constraint: z.string(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const body = await req.json().catch(() => null);
  const parsed = pentagramSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }
  if (!pentagramFieldsFilled(parsed.data)) {
    return NextResponse.json(
      { error: "Заполните все пять полей содержательно, включая Constraint" },
      { status: 400 }
    );
  }

  let challenges;
  try {
    challenges = await checkPentagramPrompt(parsed.data);
  } catch (err) {
    if (err instanceof GeminiResponseError) {
      try {
        challenges = await checkPentagramPrompt(parsed.data);
      } catch {
        return NextResponse.json({ error: "Не удалось получить проверку от Gemini. Попробуйте ещё раз." }, { status: 502 });
      }
    } else {
      return NextResponse.json({ error: "Не удалось получить проверку от Gemini. Попробуйте ещё раз." }, { status: 502 });
    }
  }

  const current = normalizeTaskSet(card.cardJson);
  const updated: TaskSetJson = {
    ...current,
    pentagram: parsed.data,
    promptChallenges: challenges,
    promptCheckedSnapshot: { ...parsed.data },
    promptResponses: challenges.map((c) => ({ question: c.question, field: c.field, answer: "" })),
  };

  await prisma.card.update({
    where: { id },
    data: { cardJson: updated as unknown as Prisma.InputJsonValue },
  });

  return NextResponse.json({
    challenges,
    checkedSnapshot: updated.promptCheckedSnapshot,
    responses: updated.promptResponses,
  });
}
