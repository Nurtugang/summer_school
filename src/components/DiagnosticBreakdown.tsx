import { Panel } from "@/components/ui";
import type { DiagnosticBreakdownItem } from "@/lib/diagnostic";

export function DiagnosticBreakdown({
  scorePercent,
  status,
  breakdown,
}: {
  scorePercent: number;
  status: "scored" | "pending_review";
  breakdown: DiagnosticBreakdownItem[];
}) {
  const byTask = new Map<string, DiagnosticBreakdownItem[]>();
  for (const item of breakdown) {
    const list = byTask.get(item.taskId) ?? [];
    list.push(item);
    byTask.set(item.taskId, list);
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel className="border-l-4 border-l-forest">
        <p className="text-[13px] uppercase tracking-[.08em] text-muted">Результат попытки</p>
        <p className="text-[32px] font-heading font-semibold text-forest">{scorePercent.toFixed(0)}%</p>
        {status === "pending_review" ? (
          <p className="mt-1 text-[13px] text-terracotta">
            Часть объяснений отправлена на ручную проверку и не учтена в этом проценте.
          </p>
        ) : null}
      </Panel>

      <div className="flex flex-col gap-3">
        {[...byTask.entries()].map(([taskId, items]) => {
          const identification = items.find((i) => i.kind === "identification")!;
          const fix = items.find((i) => i.kind === "fix");
          return (
            <Panel key={taskId} className="flex flex-col gap-2">
              <p className="text-[12px] uppercase tracking-[.06em] text-muted">{identification.level}</p>
              <p className="text-[15px] text-ink">{identification.taskText}</p>
              <p className={`text-[14px] ${identification.correct ? "text-forest" : "text-terracotta"}`}>
                Вы отметили: {identification.markedBroken ? "сломана" : "работает корректно"} —{" "}
                {identification.correct ? "верно" : "неверно"}
                {!identification.correct
                  ? ` (на самом деле ${identification.isBrokenTruth ? "сломана" : "работает корректно"})`
                  : ""}
              </p>
              {fix ? (
                fix.status === "pending_review" ? (
                  <p className="text-[14px] text-terracotta">Объяснение отправлено на ручную проверку</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-[14px] text-muted">
                      Баллы за объяснение: {fix.pointsEarned} из {fix.pointsMax}
                    </p>
                    {fix.rubricResults?.map((r, ri) => (
                      <div key={ri} className="flex items-start gap-2 text-[13px]">
                        <span className={r.met ? "text-forest" : "text-terracotta"}>{r.met ? "✓" : "✗"}</span>
                        <span className="text-ink">
                          {r.criterion} — <span className="text-muted">{r.why}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )
              ) : null}
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
