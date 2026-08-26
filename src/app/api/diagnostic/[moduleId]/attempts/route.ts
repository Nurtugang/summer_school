import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAX_QUIZ_ATTEMPTS } from "@/lib/config";
import { ensureDiagnosticTasksForUser, scoreDiagnosticAttempt, type DiagnosticAnswer } from "@/lib/diagnostic";

const schema = z.object({
  answers: z.record(
    z.string(),
    z.object({ markedBroken: z.boolean(), fixText: z.string().optional() })
  ),
});

export async function POST(req: Request, { params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { specialization: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const attemptsUsed = await prisma.diagnosticAttempt.count({
    where: { userId: session.user.id, moduleId },
  });
  if (attemptsUsed >= MAX_QUIZ_ATTEMPTS) {
    return NextResponse.json({ error: "Попытки закончились" }, { status: 400 });
  }

  const tasks = await ensureDiagnosticTasksForUser(moduleId, session.user.id, user.specialization);
  if (tasks.length === 0) {
    return NextResponse.json({ error: "Диагностика недоступна для этого модуля" }, { status: 400 });
  }

  const answers = parsed.data.answers as Record<string, DiagnosticAnswer>;
  const result = await scoreDiagnosticAttempt(tasks, answers);

  await prisma.diagnosticAttempt.create({
    data: {
      userId: session.user.id,
      moduleId,
      answersJson: answers as unknown as Prisma.InputJsonValue,
      breakdownJson: result.breakdown as unknown as Prisma.InputJsonValue,
      scorePercent: result.scorePercent,
      status: result.status,
    },
  });

  return NextResponse.json({
    breakdown: result.breakdown,
    scorePercent: result.scorePercent,
    status: result.status,
    attemptsRemaining: MAX_QUIZ_ATTEMPTS - attemptsUsed - 1,
  });
}
