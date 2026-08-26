import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAX_QUIZ_ATTEMPTS, QUIZ_MODULE_CONTEXT } from "@/lib/config";
import { ensureQuestionsForUser, scoreAttempt } from "@/lib/quiz";

const schema = z.object({
  answers: z.record(z.string(), z.string()),
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

  const [moduleRecord, user] = await Promise.all([
    prisma.module.findUnique({ where: { id: moduleId } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { specialization: true } }),
  ]);
  if (!moduleRecord || !user) {
    return NextResponse.json({ error: "Тест недоступен для этого модуля" }, { status: 400 });
  }

  const attemptsUsed = await prisma.quizAttempt.count({
    where: { userId: session.user.id, moduleId },
  });
  if (attemptsUsed >= MAX_QUIZ_ATTEMPTS) {
    return NextResponse.json({ error: "Попытки закончились" }, { status: 400 });
  }

  const questions = await ensureQuestionsForUser(
    moduleId,
    session.user.id,
    user.specialization,
    QUIZ_MODULE_CONTEXT[moduleRecord.order] ?? moduleRecord.title
  );
  if (questions.length === 0) {
    return NextResponse.json({ error: "Тест недоступен для этого модуля" }, { status: 400 });
  }

  const result = await scoreAttempt(questions, parsed.data.answers);

  await prisma.quizAttempt.create({
    data: {
      userId: session.user.id,
      moduleId,
      answersJson: parsed.data.answers as unknown as Prisma.InputJsonValue,
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
