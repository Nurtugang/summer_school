"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorText, Panel, Textarea } from "@/components/ui";
import { DiagnosticBreakdown } from "@/components/DiagnosticBreakdown";
import type { DiagnosticBreakdownItem } from "@/lib/diagnostic";
import type { PublicDiagnosticTask } from "@/lib/diagnostic";

interface AttemptResponse {
  breakdown: DiagnosticBreakdownItem[];
  scorePercent: number;
  status: "scored" | "pending_review";
  attemptsRemaining: number;
}

interface AnswerState {
  markedBroken: boolean | null;
  fixText: string;
}

export function DiagnosticRunner({
  moduleId,
  tasks,
  attemptsRemaining: initialAttemptsRemaining,
  maxAttempts,
}: {
  moduleId: string;
  tasks: PublicDiagnosticTask[];
  attemptsRemaining: number;
  maxAttempts: number;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AttemptResponse | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState(initialAttemptsRemaining);

  function setMarked(taskId: string, markedBroken: boolean) {
    setAnswers((a) => ({ ...a, [taskId]: { markedBroken, fixText: a[taskId]?.fixText ?? "" } }));
  }

  function setFixText(taskId: string, fixText: string) {
    setAnswers((a) => ({ ...a, [taskId]: { markedBroken: a[taskId]?.markedBroken ?? null, fixText } }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const unanswered = tasks.filter((t) => answers[t.id]?.markedBroken === null || answers[t.id]?.markedBroken === undefined);
    if (unanswered.length > 0) {
      setError("Отметьте «сломана» или «работает корректно» для каждого задания");
      return;
    }
    const missingFix = tasks.filter((t) => answers[t.id]?.markedBroken && !answers[t.id]?.fixText.trim());
    if (missingFix.length > 0) {
      setError("Для заданий, отмеченных как «сломана», объясните, как починить");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const payload: Record<string, { markedBroken: boolean; fixText?: string }> = {};
      for (const t of tasks) {
        payload[t.id] = { markedBroken: !!answers[t.id]?.markedBroken, fixText: answers[t.id]?.fixText };
      }
      const res = await fetch(`/api/diagnostic/${moduleId}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Не удалось отправить попытку");
        return;
      }
      setResult(data);
      setAttemptsRemaining(data.attemptsRemaining);
      router.refresh();
    } catch {
      setError(
        "Не удалось получить ответ — проверка заняла слишком много времени. Обновите страницу: попытка почти наверняка уже засчиталась, просто не успела показать результат."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function retry() {
    setResult(null);
    setAnswers({});
  }

  if (result) {
    return (
      <div className="flex flex-col gap-5">
        <DiagnosticBreakdown scorePercent={result.scorePercent} status={result.status} breakdown={result.breakdown} />
        {attemptsRemaining > 0 ? (
          <Button onClick={retry}>Пройти ещё раз ({attemptsRemaining} попыток осталось)</Button>
        ) : (
          <p className="text-[15px] text-muted">Попытки закончились. В рейтинг идёт лучший результат.</p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <p className="text-[14px] text-muted">
        Попытка {maxAttempts - attemptsRemaining + 1} из {maxAttempts}
      </p>
      {tasks.map((t, i) => {
        const answer = answers[t.id];
        return (
          <Panel key={t.id} className="flex flex-col gap-3">
            <p className="text-[12px] uppercase tracking-[.06em] text-muted">{t.level}</p>
            <p className="text-[15px] text-ink">
              {i + 1}. {t.taskText}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMarked(t.id, false)}
                className={`tap-target flex-1 border text-[15px] ${
                  answer?.markedBroken === false ? "border-forest bg-forest text-paper" : "border-line bg-white text-ink"
                }`}
              >
                Работает корректно
              </button>
              <button
                type="button"
                onClick={() => setMarked(t.id, true)}
                className={`tap-target flex-1 border text-[15px] ${
                  answer?.markedBroken === true ? "border-terracotta bg-terracotta text-paper" : "border-line bg-white text-ink"
                }`}
              >
                Сломана
              </button>
            </div>
            {answer?.markedBroken ? (
              <Textarea
                rows={3}
                placeholder="Как починить?"
                value={answer.fixText}
                onChange={(e) => setFixText(t.id, e.target.value)}
              />
            ) : null}
          </Panel>
        );
      })}

      <ErrorText>{error}</ErrorText>

      <Button type="submit" disabled={submitting}>
        {submitting ? "Проверяем…" : "Отправить"}
      </Button>
    </form>
  );
}
