import {
  MAX_REVIEWS_PER_USER,
  OPEN_QUESTIONS_COUNT_IN_RATING,
  TUTOR_PROMPT_FIXED_SCORE,
  W_CARD,
  W_QUIZ,
  W_REVIEW_BONUS,
} from "@/lib/config";
import { scorePercentExcludingOpen, type BreakdownItem } from "@/lib/quiz";
import { diagnosticScorePercentExcludingAiGraded, type DiagnosticBreakdownItem } from "@/lib/diagnostic";

interface ReviewLike {
  alignmentScore: number;
  resilienceScore: number;
}

/** Average of the two criteria a single review scored, on a 1–5 scale. */
function reviewAverage(r: ReviewLike): number {
  return (r.alignmentScore + r.resilienceScore) / 2;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Балл работы (1–5) — медиана по рецензентам (устойчивее к одному «троллю», чем среднее). */
export function cardScore(reviews: ReviewLike[]): number | null {
  if (reviews.length === 0) return null;
  return median(reviews.map(reviewAverage));
}

const NO_REVIEW_KINDS = ["tutor_prompt", "pentagram_prompt"];

/**
 * Балл работы (1–5) с учётом заданий-тренажёров (М2 Pentagram, М3 Тьютор): у них нет рецензии
 * и ИИ не судья, поэтому зачтённая (submitted) работа такого вида даёт фиксированный балл
 * вместо медианы по рецензентам.
 */
export function cardScoreForCard(kind: string, reviews: ReviewLike[]): number | null {
  if (NO_REVIEW_KINDS.includes(kind)) return TUTOR_PROMPT_FIXED_SCORE;
  return cardScore(reviews);
}

interface QuizAttemptLike {
  moduleId: string;
  scorePercent: number;
  breakdownJson: unknown;
}

interface DiagnosticAttemptLike {
  moduleId: string;
  scorePercent: number;
  breakdownJson: unknown;
}

interface ScoredActivity {
  activityKey: string;
  score: number;
}

function quizToActivity(attempt: QuizAttemptLike): ScoredActivity {
  const score = OPEN_QUESTIONS_COUNT_IN_RATING
    ? attempt.scorePercent
    : scorePercentExcludingOpen(attempt.breakdownJson as BreakdownItem[]);
  return { activityKey: `${attempt.moduleId}:quiz`, score };
}

function diagnosticToActivity(attempt: DiagnosticAttemptLike): ScoredActivity {
  const score = OPEN_QUESTIONS_COUNT_IN_RATING
    ? attempt.scorePercent
    : diagnosticScorePercentExcludingAiGraded(attempt.breakdownJson as DiagnosticBreakdownItem[]);
  return { activityKey: `${attempt.moduleId}:diagnostic`, score };
}

/** Average of the user's best score per test-like activity (0–100), across everything they've attempted. */
export function quizComponent(quizAttempts: QuizAttemptLike[], diagnosticAttempts: DiagnosticAttemptLike[] = []): number {
  const activities = [...quizAttempts.map(quizToActivity), ...diagnosticAttempts.map(diagnosticToActivity)];
  if (activities.length === 0) return 0;

  const bestByActivity = new Map<string, number>();
  for (const { activityKey, score } of activities) {
    const current = bestByActivity.get(activityKey);
    if (current === undefined || score > current) bestByActivity.set(activityKey, score);
  }
  const values = [...bestByActivity.values()];
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Average card score (1–5) normalized to 0–100, across the user's reviewed submitted cards. */
export function cardComponent(cardScores: (number | null)[]): number {
  const scored = cardScores.filter((s): s is number => s !== null);
  if (scored.length === 0) return 0;
  const avg = scored.reduce((a, b) => a + b, 0) / scored.length;
  return (avg / 5) * 100;
}

export interface TeacherRatingInput {
  quizComponent: number;
  cardComponent: number;
  reviewsGiven: number;
}

export interface TeacherRatingResult {
  quizComponent: number;
  cardComponent: number;
  reviewComponent: number;
  total: number;
}

/** Итог — взвешенная сумма трёх компонент (0–100 каждая), веса из конфига (сумма = 1.0). */
export function teacherRating(input: TeacherRatingInput): TeacherRatingResult {
  const reviewComponent = Math.min(input.reviewsGiven / MAX_REVIEWS_PER_USER, 1) * 100;
  const total =
    W_QUIZ * input.quizComponent + W_CARD * input.cardComponent + W_REVIEW_BONUS * reviewComponent;
  return {
    quizComponent: input.quizComponent,
    cardComponent: input.cardComponent,
    reviewComponent,
    total,
  };
}
