"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorText, Panel, Textarea } from "@/components/ui";
import { QuizBreakdown } from "@/components/QuizBreakdown";
import type { BreakdownItem, PublicQuestion } from "@/lib/quiz";

interface AttemptResponse {
  breakdown: BreakdownItem[];
  scorePercent: number;
  status: "scored" | "pending_review";
  attemptsRemaining: number;
}

export function QuizRunner({
  moduleId,
  questions,
  attemptsRemaining: initialAttemptsRemaining,
  maxAttempts,
}: {
  moduleId: string;
  questions: PublicQuestion[];
  attemptsRemaining: number;
  maxAttempts: number;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AttemptResponse | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState(initialAttemptsRemaining);

  function setAnswer(id: string, value: string) {
    setAnswers((a) => ({ ...a, [id]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const unanswered = questions.filter((q) => !answers[q.id]?.trim());
    if (unanswered.length > 0) {
      setError("Ответьте на все вопросы перед отправкой");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/quiz/${moduleId}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Не удалось отправить тест");
        return;
      }
      setResult(data);
      setAttemptsRemaining(data.attemptsRemaining);
      router.refresh();
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
        <QuizBreakdown scorePercent={result.scorePercent} status={result.status} breakdown={result.breakdown} />
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
      {questions.map((q, i) => (
        <Panel key={q.id} className="flex flex-col gap-3">
          <p className="text-[15px] font-medium text-ink">
            {i + 1}. {q.prompt}
          </p>
          {q.options ? (
            <div className="flex flex-col gap-2">
              {q.options.map((opt) => (
                <label key={opt.id} className="tap-target flex items-center gap-3 text-[15px]">
                  <input
                    type="radio"
                    name={q.id}
                    value={opt.id}
                    checked={answers[q.id] === opt.id}
                    onChange={() => setAnswer(q.id, opt.id)}
                    className="h-5 w-5 accent-forest"
                  />
                  <span>
                    <strong>{opt.id})</strong> {opt.text}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <Textarea
              rows={4}
              value={answers[q.id] ?? ""}
              onChange={(e) => setAnswer(q.id, e.target.value)}
            />
          )}
        </Panel>
      ))}

      <ErrorText>{error}</ErrorText>

      <Button type="submit" disabled={submitting}>
        {submitting ? "Проверяем…" : "Отправить тест"}
      </Button>
    </form>
  );
}
