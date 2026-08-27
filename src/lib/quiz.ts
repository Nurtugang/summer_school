import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { gradeOpenAnswer, generateCaseQuestions, GeminiResponseError } from "@/lib/gemini";

export type QuestionType = "theory_closed" | "case_closed" | "case_open";

export interface QuestionOption {
  id: string;
  text: string;
}

export interface QuestionRow {
  id: string;
  type: string;
  prompt: string;
  options: unknown;
  correctOptionId: string | null;
  rubric: unknown;
  points: number;
}

export interface PublicQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options: QuestionOption[] | null;
  points: number;
}

export function sanitizeQuestion(q: QuestionRow): PublicQuestion {
  return {
    id: q.id,
    type: q.type as QuestionType,
    prompt: q.prompt,
    options: (q.options as QuestionOption[] | null) ?? null,
    points: q.points,
  };
}

export interface RubricResultItem {
  criterion: string;
  met: boolean;
  why: string;
}

export interface BreakdownItem {
  questionId: string;
  type: QuestionType;
  prompt: string;
  pointsMax: number;
  pointsEarned: number | null;
  status: "graded" | "pending_review";
  selectedOptionId?: string | null;
  correctOptionId?: string | null;
  correct?: boolean;
  studentAnswer?: string;
  rubricResults?: RubricResultItem[];
}

export interface AttemptResult {
  breakdown: BreakdownItem[];
  scorePercent: number;
  status: "scored" | "pending_review";
}

async function gradeOpenQuestionWithRetry(
  prompt: string,
  rubric: string[],
  answer: string
): Promise<{ rubricResults: RubricResultItem[]; earned: number } | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await gradeOpenAnswer(prompt, rubric, answer);
      return { rubricResults: result.results, earned: result.score };
    } catch (err) {
      if (!(err instanceof GeminiResponseError)) {
        // network/config error — no point retrying immediately
        break;
      }
    }
  }
  return null;
}

export async function scoreAttempt(
  questions: QuestionRow[],
  answers: Record<string, string>
): Promise<AttemptResult> {
  // Открытые вопросы оцениваются параллельно (не по одному) — иначе на несколько
  // последовательных вызовов Gemini суммарное время запроса легко превышает таймаут nginx.
  const breakdown: BreakdownItem[] = await Promise.all(
    questions.map(async (q): Promise<BreakdownItem> => {
      const type = q.type as QuestionType;
      const answer = answers[q.id] ?? "";

      if (type === "theory_closed" || type === "case_closed") {
        const correct = answer !== "" && answer === q.correctOptionId;
        return {
          questionId: q.id,
          type,
          prompt: q.prompt,
          pointsMax: q.points,
          pointsEarned: correct ? q.points : 0,
          status: "graded",
          selectedOptionId: answer || null,
          correctOptionId: q.correctOptionId,
          correct,
        };
      }

      // case_open
      const rubric = (q.rubric as string[] | null) ?? [];
      const graded = await gradeOpenQuestionWithRetry(q.prompt, rubric, answer);

      if (!graded) {
        return {
          questionId: q.id,
          type,
          prompt: q.prompt,
          pointsMax: q.points,
          pointsEarned: null,
          status: "pending_review",
          studentAnswer: answer,
        };
      }

      return {
        questionId: q.id,
        type,
        prompt: q.prompt,
        pointsMax: q.points,
        pointsEarned: graded.earned,
        status: "graded",
        studentAnswer: answer,
        rubricResults: graded.rubricResults,
      };
    })
  );

  const gradedItems = breakdown.filter((b) => b.status === "graded");
  const maxPoints = gradedItems.reduce((sum, b) => sum + b.pointsMax, 0);
  const earnedPoints = gradedItems.reduce((sum, b) => sum + (b.pointsEarned ?? 0), 0);
  const scorePercent = maxPoints > 0 ? (earnedPoints / maxPoints) * 100 : 0;
  const status = breakdown.some((b) => b.status === "pending_review") ? "pending_review" : "scored";

  return { breakdown, scorePercent, status };
}

export function scorePercentExcludingOpen(breakdown: BreakdownItem[]): number {
  const closed = breakdown.filter((b) => b.type !== "case_open" && b.status === "graded");
  const maxPoints = closed.reduce((sum, b) => sum + b.pointsMax, 0);
  const earnedPoints = closed.reduce((sum, b) => sum + (b.pointsEarned ?? 0), 0);
  return maxPoints > 0 ? (earnedPoints / maxPoints) * 100 : 0;
}

/**
 * Возвращает полный набор вопросов теста для пользователя: универсальная теория (общая для
 * всех) + практические кейсы, подобранные под его специализацию. При первом обращении кейсы
 * генерируются через Gemini и сохраняются за пользователем; при повторных — переиспользуются.
 * При сбое генерации — запасные общие кейсы из сида (userId = null).
 */
export async function ensureQuestionsForUser(
  moduleId: string,
  userId: string,
  specialization: string,
  moduleContext: string
): Promise<QuestionRow[]> {
  const theory = await prisma.question.findMany({
    where: { moduleId, userId: null, type: "theory_closed" },
    orderBy: { order: "asc" },
  });

  let cases = await prisma.question.findMany({
    where: { moduleId, userId, type: { in: ["case_closed", "case_open"] } },
    orderBy: { order: "asc" },
  });

  if (cases.length === 0) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const generated = await generateCaseQuestions(specialization, moduleContext);
        const creates = [
          ...generated.closedCases.map((c, i) =>
            prisma.question.create({
              data: {
                moduleId,
                userId,
                type: "case_closed",
                order: 100 + i,
                prompt: c.prompt,
                options: c.options as unknown as Prisma.InputJsonValue,
                correctOptionId: c.correctOptionId,
                points: 1,
              },
            })
          ),
          ...generated.openCases.map((c, i) =>
            prisma.question.create({
              data: {
                moduleId,
                userId,
                type: "case_open",
                order: 200 + i,
                prompt: c.prompt,
                rubric: c.rubric as unknown as Prisma.InputJsonValue,
                points: c.rubric.length,
              },
            })
          ),
        ];
        cases = await prisma.$transaction(creates);
        break;
      } catch (err) {
        if (!(err instanceof GeminiResponseError)) break;
      }
    }
  }

  if (cases.length === 0) {
    cases = await prisma.question.findMany({
      where: { moduleId, userId: null, type: { in: ["case_closed", "case_open"] } },
      orderBy: { order: "asc" },
    });
  }

  return [...theory, ...cases].sort((a, b) => a.order - b.order) as unknown as QuestionRow[];
}
