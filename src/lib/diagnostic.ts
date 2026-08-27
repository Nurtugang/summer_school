import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { gradeOpenAnswer, generateDiagnosticTasks, GeminiResponseError } from "@/lib/gemini";
import type { RubricResultItem } from "@/lib/quiz";

export interface DiagnosticTaskRow {
  id: string;
  order: number;
  level: string;
  taskText: string;
  isBroken: boolean;
  fixRubric: unknown;
}

export interface PublicDiagnosticTask {
  id: string;
  order: number;
  level: string;
  taskText: string;
}

export function sanitizeDiagnosticTask(t: DiagnosticTaskRow): PublicDiagnosticTask {
  return { id: t.id, order: t.order, level: t.level, taskText: t.taskText };
}

export interface DiagnosticAnswer {
  markedBroken: boolean;
  fixText?: string;
}

export interface DiagnosticBreakdownItem {
  taskId: string;
  kind: "identification" | "fix";
  level: string;
  taskText: string;
  pointsMax: number;
  pointsEarned: number | null;
  status: "graded" | "pending_review";
  isBrokenTruth?: boolean;
  markedBroken?: boolean;
  correct?: boolean;
  fixText?: string;
  rubricResults?: RubricResultItem[];
}

export interface DiagnosticAttemptResult {
  breakdown: DiagnosticBreakdownItem[];
  scorePercent: number;
  status: "scored" | "pending_review";
}

async function gradeFixWithRetry(
  taskText: string,
  rubric: string[],
  answer: string
): Promise<{ results: RubricResultItem[]; earned: number } | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await gradeOpenAnswer(`${taskText}\n\nОбъясните, как починить это задание.`, rubric, answer);
      return { results: result.results, earned: result.score };
    } catch (err) {
      if (!(err instanceof GeminiResponseError)) break;
    }
  }
  return null;
}

export async function scoreDiagnosticAttempt(
  tasks: DiagnosticTaskRow[],
  answers: Record<string, DiagnosticAnswer>
): Promise<DiagnosticAttemptResult> {
  // Задания оцениваются параллельно (не по одному) — иначе на несколько последовательных
  // вызовов Gemini суммарное время запроса легко превышает таймаут nginx.
  const perTask = await Promise.all(
    tasks.map(async (task): Promise<DiagnosticBreakdownItem[]> => {
      const answer = answers[task.id] ?? { markedBroken: false };
      const correct = answer.markedBroken === task.isBroken;

      const identification: DiagnosticBreakdownItem = {
        taskId: task.id,
        kind: "identification",
        level: task.level,
        taskText: task.taskText,
        pointsMax: 1,
        pointsEarned: correct ? 1 : 0,
        status: "graded",
        isBrokenTruth: task.isBroken,
        markedBroken: answer.markedBroken,
        correct,
      };

      if (!task.isBroken) return [identification];

      const rubric = (task.fixRubric as string[] | null) ?? [];
      const fixText = (answer.fixText ?? "").trim();

      if (!answer.markedBroken || !fixText) {
        return [
          identification,
          {
            taskId: task.id,
            kind: "fix",
            level: task.level,
            taskText: task.taskText,
            pointsMax: rubric.length,
            pointsEarned: 0,
            status: "graded",
            fixText,
          },
        ];
      }

      const graded = await gradeFixWithRetry(task.taskText, rubric, fixText);
      if (!graded) {
        return [
          identification,
          {
            taskId: task.id,
            kind: "fix",
            level: task.level,
            taskText: task.taskText,
            pointsMax: rubric.length,
            pointsEarned: null,
            status: "pending_review",
            fixText,
          },
        ];
      }

      return [
        identification,
        {
          taskId: task.id,
          kind: "fix",
          level: task.level,
          taskText: task.taskText,
          pointsMax: rubric.length,
          pointsEarned: graded.earned,
          status: "graded",
          fixText,
          rubricResults: graded.results,
        },
      ];
    })
  );
  const breakdown = perTask.flat();

  const gradedItems = breakdown.filter((b) => b.status === "graded");
  const maxPoints = gradedItems.reduce((sum, b) => sum + b.pointsMax, 0);
  const earnedPoints = gradedItems.reduce((sum, b) => sum + (b.pointsEarned ?? 0), 0);
  const scorePercent = maxPoints > 0 ? (earnedPoints / maxPoints) * 100 : 0;
  const status = breakdown.some((b) => b.status === "pending_review") ? "pending_review" : "scored";

  return { breakdown, scorePercent, status };
}

export function diagnosticScorePercentExcludingAiGraded(breakdown: DiagnosticBreakdownItem[]): number {
  const local = breakdown.filter((b) => b.kind === "identification" && b.status === "graded");
  const maxPoints = local.reduce((sum, b) => sum + b.pointsMax, 0);
  const earnedPoints = local.reduce((sum, b) => sum + (b.pointsEarned ?? 0), 0);
  return maxPoints > 0 ? (earnedPoints / maxPoints) * 100 : 0;
}

/**
 * Возвращает 6 диагностических заданий для конкретного пользователя, подобранных под его
 * специализацию. При первом обращении генерирует их через Gemini и сохраняет; при повторных —
 * переиспользует сохранённый набор (чтобы несколько попыток проверялись по одним и тем же
 * заданиям). При сбое генерации — запасной общий набор из сида (userId = null).
 */
export async function ensureDiagnosticTasksForUser(
  moduleId: string,
  userId: string,
  specialization: string
): Promise<DiagnosticTaskRow[]> {
  const existing = await prisma.diagnosticTask.findMany({
    where: { moduleId, userId },
    orderBy: { order: "asc" },
  });
  if (existing.length > 0) return existing as unknown as DiagnosticTaskRow[];

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const generated = await generateDiagnosticTasks(specialization);
      const created = await prisma.$transaction(
        generated.map((t, i) =>
          prisma.diagnosticTask.create({
            data: {
              moduleId,
              userId,
              order: i + 1,
              level: t.level,
              taskText: t.taskText,
              isBroken: t.isBroken,
              fixRubric: (t.fixRubric ?? undefined) as unknown as Prisma.InputJsonValue,
            },
          })
        )
      );
      return created as unknown as DiagnosticTaskRow[];
    } catch (err) {
      if (!(err instanceof GeminiResponseError)) break;
    }
  }

  const fallback = await prisma.diagnosticTask.findMany({
    where: { moduleId, userId: null },
    orderBy: { order: "asc" },
  });
  return fallback as unknown as DiagnosticTaskRow[];
}
