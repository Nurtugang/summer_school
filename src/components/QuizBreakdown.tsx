import { Panel } from "@/components/ui";
import type { BreakdownItem } from "@/lib/quiz";

export function QuizBreakdown({
  scorePercent,
  status,
  breakdown,
}: {
  scorePercent: number;
  status: "scored" | "pending_review";
  breakdown: BreakdownItem[];
}) {
  return (
    <div className="flex flex-col gap-5">
      <Panel className="border-l-4 border-l-forest">
        <p className="text-[13px] uppercase tracking-[.08em] text-muted">Результат попытки</p>
        <p className="text-[32px] font-heading font-semibold text-forest">{scorePercent.toFixed(0)}%</p>
        {status === "pending_review" ? (
          <p className="mt-1 text-[13px] text-terracotta">
            Часть открытых ответов отправлена на ручную проверку и не учтена в этом проценте.
          </p>
        ) : null}
      </Panel>

      <div className="flex flex-col gap-3">
        {breakdown.map((item, i) => (
          <Panel key={item.questionId} className="flex flex-col gap-2">
            <p className="text-[15px] font-medium text-ink">
              {i + 1}. {item.prompt}
            </p>
            {item.type !== "case_open" ? (
              <p className={`text-[14px] ${item.correct ? "text-forest" : "text-terracotta"}`}>
                {item.correct ? "Верно" : "Неверно"}
                {!item.correct && item.correctOptionId ? ` — правильный ответ: ${item.correctOptionId}` : ""}
              </p>
            ) : item.status === "pending_review" ? (
              <p className="text-[14px] text-terracotta">На ручную проверку</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {item.studentAnswer ? (
                  <p className="border border-line bg-white/60 px-3 py-2 text-[14px] text-ink">
                    {item.studentAnswer}
                  </p>
                ) : null}
                <p className="text-[14px] text-muted">
                  Баллы: {item.pointsEarned} из {item.pointsMax}
                </p>
                {item.rubricResults?.map((r, ri) => (
                  <div key={ri} className="flex items-start gap-2 text-[13px]">
                    <span className={r.met ? "text-forest" : "text-terracotta"}>{r.met ? "✓" : "✗"}</span>
                    <span className="text-ink">
                      {r.criterion} — <span className="text-muted">{r.why}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        ))}
      </div>
    </div>
  );
}
