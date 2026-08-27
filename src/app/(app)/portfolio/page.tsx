import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Eyebrow, Panel } from "@/components/ui";
import type { NotebookCardJson } from "@/lib/notebookLog";

export default async function PortfolioPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const cards = await prisma.card.findMany({
    where: { userId: session.user.id, kind: "notebook_log" },
    include: { module: true },
    orderBy: { module: { order: "asc" } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Eyebrow>Индивидуальное методическое AI-портфолио</Eyebrow>
        <h1 className="text-[32px] leading-tight font-heading font-bold text-ink">
          {session.user.name}
        </h1>
        <p className="mt-1 text-[14px] text-muted">
          Все промпты и результаты работы с NotebookLM, собранные по модулям дня 28, в одном месте.
        </p>
      </div>

      {cards.length === 0 ? (
        <p className="border border-line bg-white/60 px-5 py-6 text-[15px] text-muted">
          Пока нет ни одной сохранённой работы с NotebookLM.
        </p>
      ) : (
        cards.map((card) => {
          const data = card.cardJson as unknown as NotebookCardJson;
          return (
            <div key={card.id} className="flex flex-col gap-4">
              <div>
                <p className="text-[13px] uppercase tracking-[.08em] text-muted">
                  Модуль {card.module.order}
                </p>
                <h2 className="text-[22px] font-heading font-semibold text-ink">{card.module.title}</h2>
                <p className="text-[13px] text-muted">
                  {card.status === "submitted" ? "Завершено" : "Черновик"}
                </p>
              </div>
              {data.prompts.map((p, i) => (
                <Panel key={i} className="flex flex-col gap-3">
                  <p className="text-[15px] font-medium text-ink">{p.label}</p>
                  <div className="flex flex-col gap-1">
                    <p className="text-[12px] uppercase tracking-[.06em] text-muted">Промпт</p>
                    <p className="whitespace-pre-wrap border border-line bg-white/60 p-3 font-mono text-[13px] text-ink">
                      {p.promptText}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-[12px] uppercase tracking-[.06em] text-muted">Результат от NotebookLM</p>
                    <p className="whitespace-pre-wrap border border-line bg-white/60 p-3 text-[13px] text-ink">
                      {p.result || "—"}
                    </p>
                  </div>
                </Panel>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}
