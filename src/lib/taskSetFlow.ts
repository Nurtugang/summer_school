import { isFieldMeaningful } from "@/lib/triad";
import type { PentagramChallengeResponse, PentagramInput, TaskSetJson, TaskSetRow } from "@/lib/gemini";

/**
 * Заполняет поля новой схемы значениями по умолчанию для комплектов, созданных до этого
 * обновления (старая форма: { pentagram, rows, defense }, без promptChallenges/flags/generated).
 * Без этого старые черновики/сабмиты падают с TypeError на .length от undefined.
 */
export function normalizeTaskSet(raw: unknown): TaskSetJson {
  const t = (raw ?? {}) as Partial<TaskSetJson> & { pentagram?: PentagramInput; rows?: TaskSetRow[] };
  const rows = Array.isArray(t.rows) ? t.rows : [];
  return {
    pentagram: t.pentagram ?? { persona: "", context: "", task: "", output: "", constraint: "" },
    promptChallenges: Array.isArray(t.promptChallenges) ? t.promptChallenges : [],
    promptCheckedSnapshot: t.promptCheckedSnapshot ?? null,
    promptResponses: Array.isArray(t.promptResponses) ? t.promptResponses : [],
    rows,
    flags: Array.isArray(t.flags) ? t.flags : rows.map(() => ({ cheatable: false, proof: "" })),
    recheckFlags: t.recheckFlags ?? null,
    generated: typeof t.generated === "boolean" ? t.generated : rows.length > 0,
  };
}

const HIGH_LEVELS = ["Анализ (Analyze)", "Оценка (Evaluate)", "Создание (Create)"];

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export function taskChanged(current: string, original: string): boolean {
  return normalize(current) !== normalize(original);
}

export function pentagramFieldsFilled(p: PentagramInput): boolean {
  return (
    isFieldMeaningful(p.persona) &&
    isFieldMeaningful(p.context) &&
    isFieldMeaningful(p.task) &&
    isFieldMeaningful(p.output) &&
    isFieldMeaningful(p.constraint)
  );
}

function pentagramEquals(a: PentagramInput, b: PentagramInput): boolean {
  return a.persona === b.persona && a.context === b.context && a.task === b.task && a.output === b.output && a.constraint === b.constraint;
}

export function changedOrRespondedToPrompt(
  checkedSnapshot: PentagramInput | null,
  current: PentagramInput,
  responses: PentagramChallengeResponse[]
): boolean {
  if (!checkedSnapshot) return false;
  const changed = !pentagramEquals(checkedSnapshot, current);
  const allAnswered = responses.length > 0 && responses.every((r) => r.answer.trim().length > 0);
  return changed || allAnswered;
}

export function canSubmitTaskSet(taskSet: TaskSetJson, draftRows: TaskSetRow[]): boolean {
  if (!pentagramFieldsFilled(taskSet.pentagram)) return false;
  if (taskSet.promptChallenges.length === 0) return false;
  if (!taskSet.generated || taskSet.rows.length !== 6) return false;

  const flaggedIndexes = taskSet.flags
    .map((f, i) => (f.cheatable ? i : -1))
    .filter((i) => i >= 0);

  if (flaggedIndexes.length > 0) {
    return flaggedIndexes.every((i) => taskChanged(taskSet.rows[i]?.task ?? "", draftRows[i]?.task ?? ""));
  }

  // Страховка: если ИИ никого не пометил, препод обязан вручную закалить хотя бы одно
  // задание высокого уровня (Анализ / Оценка / Создание).
  return taskSet.rows.some(
    (row, i) => HIGH_LEVELS.includes(row.level) && taskChanged(row.task, draftRows[i]?.task ?? "")
  );
}
