import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { flagCheatableTasks, GeminiResponseError } from "@/lib/gemini";
import type { TaskSetJson } from "@/lib/gemini";
import { normalizeTaskSet } from "@/lib/taskSetFlow";

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
  if (!current.generated || current.rows.length !== 6) {
    return NextResponse.json({ error: "Сначала сгенерируйте задания" }, { status: 400 });
  }

  try {
    const recheckFlags = await flagCheatableTasks(current.rows, current.pentagram);
    const updated: TaskSetJson = { ...current, recheckFlags };
    await prisma.card.update({ where: { id }, data: { cardJson: updated as unknown as Prisma.InputJsonValue } });
    return NextResponse.json({ recheckFlags, unavailable: false });
  } catch (err) {
    if (err instanceof GeminiResponseError) {
      try {
        const recheckFlags = await flagCheatableTasks(current.rows, current.pentagram);
        const updated: TaskSetJson = { ...current, recheckFlags };
        await prisma.card.update({ where: { id }, data: { cardJson: updated as unknown as Prisma.InputJsonValue } });
        return NextResponse.json({ recheckFlags, unavailable: false });
      } catch {
        return NextResponse.json({ recheckFlags: null, unavailable: true });
      }
    }
    return NextResponse.json({ recheckFlags: null, unavailable: true });
  }
}
