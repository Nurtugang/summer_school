import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Eyebrow, Panel } from "@/components/ui";
import { MarkdownResult } from "@/components/MarkdownResult";
import { titleForCard } from "@/lib/cardTitle";
import type { NotebookCardJson } from "@/lib/notebookLog";
import type { TriadJson, TaskSetJson } from "@/lib/gemini";
import type { PentagramCardJson } from "@/lib/pentagramPrompt";
import type { CaseCardJson } from "@/lib/caseAssemblyPrompt";

export default async function PortfolioPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const cards = await prisma.card.findMany({
    where: { userId: session.user.id, status: "submitted" },
    include: { module: { include: { day: true } } },
    orderBy: [{ module: { day: { number: "asc" } } }, { module: { order: "asc" } }],
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Eyebrow>Индивидуальное методическое AI-портфолио</Eyebrow>
        <h1 className="text-[32px] leading-tight font-heading font-bold text-ink">{session.user.name}</h1>
        <p className="mt-1 text-[14px] text-muted">Все сданные работы за летнюю школу в одном месте.</p>
      </div>

      {cards.length === 0 ? (
        <p className="border border-line bg-white/60 px-5 py-6 text-[15px] text-muted">
          Пока нет ни одной сданной работы.
        </p>
      ) : (
        cards.map((card) => (
          <div key={card.id} className="flex flex-col gap-3">
            <div>
              <p className="text-[13px] uppercase tracking-[.08em] text-muted">
                {card.module.day.number} августа · Модуль {card.module.order} · {card.module.title}
              </p>
              <h2 className="text-[20px] font-heading font-semibold text-ink">
                {titleForCard(card.kind, card.cardJson)}
              </h2>
            </div>

            {card.kind === "alignment_card" ? (
              (() => {
                const t = card.cardJson as unknown as TriadJson;
                return (
                  <Panel className="flex flex-col gap-2">
                    <p className="text-[13px] text-muted">
                      {t.header.topic} · {t.header.level} · {t.header.duration} мин
                    </p>
                    <div>
                      <p className="text-[12px] uppercase tracking-[.06em] text-muted">Результат обучения</p>
                      <p className="text-[14px] text-ink">{t.outcome}</p>
                    </div>
                    <div>
                      <p className="text-[12px] uppercase tracking-[.06em] text-muted">Проверка</p>
                      <p className="text-[14px] text-ink">{t.assessment}</p>
                    </div>
                    <div>
                      <p className="text-[12px] uppercase tracking-[.06em] text-muted">Активность</p>
                      <p className="text-[14px] text-ink">{t.activity}</p>
                    </div>
                  </Panel>
                );
              })()
            ) : card.kind === "task_set" ? (
              (() => {
                const t = card.cardJson as unknown as TaskSetJson;
                return (
                  <Panel className="flex flex-col gap-2">
                    <p className="text-[13px] text-muted">{t.pentagram.context}</p>
                    <ul className="flex flex-col gap-1.5">
                      {t.rows.map((row, i) => (
                        <li key={i} className="text-[14px] text-ink">
                          <span className="text-muted">{row.level}:</span> {row.task}
                        </li>
                      ))}
                    </ul>
                  </Panel>
                );
              })()
            ) : card.kind === "pentagram_prompt" ? (
              (() => {
                const p = card.cardJson as unknown as PentagramCardJson;
                return (
                  <Panel className="flex flex-col gap-2">
                    {p.result ? <MarkdownResult text={p.result} /> : null}
                  </Panel>
                );
              })()
            ) : card.kind === "case_prompt" ? (
              (() => {
                const p = card.cardJson as unknown as CaseCardJson;
                return (
                  <Panel className="flex flex-col gap-2">
                    {p.result ? <MarkdownResult text={p.result} /> : null}
                  </Panel>
                );
              })()
            ) : card.kind === "notebook_log" ? (
              (() => {
                const n = card.cardJson as unknown as NotebookCardJson;
                return (
                  <div className="flex flex-col gap-3">
                    {n.prompts.map((p, i) => (
                      <Panel key={i} className="flex flex-col gap-2">
                        <p className="text-[14px] font-medium text-ink">{p.label}</p>
                        <p className="whitespace-pre-wrap text-[13px] text-ink">{p.result || "—"}</p>
                      </Panel>
                    ))}
                  </div>
                );
              })()
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}
