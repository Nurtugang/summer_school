import { Panel, Eyebrow } from "@/components/ui";
import type { TriadJson, TaskSetJson } from "@/lib/gemini";

export function CardReadOnly({ card, kind }: { card: TriadJson | TaskSetJson; kind: string }) {
  if (kind === "task_set") {
    const taskSet = card as TaskSetJson;
    return (
      <div className="flex flex-col gap-5">
        <Panel className="flex flex-col gap-2">
          <p className="text-[12px] uppercase tracking-[.08em] text-muted">Pentagram-промпт</p>
          <p className="text-[14px] text-ink">
            <strong>Роль ИИ:</strong> {taskSet.pentagram.persona}
          </p>
          <p className="text-[14px] text-ink">
            <strong>Контекст:</strong> {taskSet.pentagram.context}
          </p>
          <p className="text-[14px] text-ink">
            <strong>Задача:</strong> {taskSet.pentagram.task}
          </p>
          <p className="text-[14px] text-ink">
            <strong>Ограничения:</strong> {taskSet.pentagram.constraint}
          </p>
        </Panel>

        <div className="flex flex-col gap-3">
          {taskSet.rows.map((row, i) => {
            const flag = taskSet.flags[i];
            return (
              <Panel
                key={i}
                className={`flex flex-col gap-2 border-l-4 ${flag?.cheatable ? "border-l-terracotta" : "border-l-forest"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12px] uppercase tracking-[.06em] text-muted">{row.level}</p>
                  {flag?.cheatable ? (
                    <span className="border border-terracotta px-2 py-0.5 text-[11px] uppercase tracking-[.06em] text-terracotta">
                      Списывается в ИИ
                    </span>
                  ) : null}
                </div>
                <p className="text-[15px] text-ink">{row.task}</p>
              </Panel>
            );
          })}
        </div>
      </div>
    );
  }

  const triad = card as TriadJson;
  return (
    <div className="flex flex-col gap-5">
      <Panel className="flex flex-col gap-2">
        <p className="text-[19px] font-heading font-semibold text-ink">{triad.header.topic}</p>
        <p className="text-[14px] text-muted">
          {triad.header.level} · {triad.header.duration}
        </p>
      </Panel>

      <Panel className="flex flex-col gap-2 border-l-4 border-l-forest">
        <p className="text-[12px] uppercase tracking-[.08em] text-muted">Результат обучения</p>
        <p className="text-[15px] text-ink">{triad.outcome}</p>
      </Panel>
      <Panel className="flex flex-col gap-2 border-l-4 border-l-forest">
        <p className="text-[12px] uppercase tracking-[.08em] text-muted">Проверка</p>
        <p className="text-[15px] text-ink">{triad.assessment}</p>
      </Panel>
      <Panel className="flex flex-col gap-2 border-l-4 border-l-forest">
        <p className="text-[12px] uppercase tracking-[.08em] text-muted">Активность</p>
        <p className="text-[15px] text-ink">{triad.activity}</p>
      </Panel>

      {triad.challenges.length > 0 ? (
        <Panel className="bg-mint flex flex-col gap-3">
          <Eyebrow>Проверка на согласованность</Eyebrow>
          {triad.challenges.map((challenge, i) => (
            <div key={i} className="flex flex-col gap-1">
              <p className="text-[14px] text-ink">
                <strong>Вопрос ИИ:</strong> {challenge.question}
              </p>
              <p className="text-[14px] text-muted">
                <strong>Ответ:</strong> {triad.responses[i]?.answer || "(поправлена триада)"}
              </p>
            </div>
          ))}
        </Panel>
      ) : null}
    </div>
  );
}
