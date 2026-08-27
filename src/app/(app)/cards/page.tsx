import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button, Eyebrow } from "@/components/ui";
import { titleForCard } from "@/lib/cardTitle";

export default async function MyCardsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const cards = await prisma.card.findMany({
    where: { userId: session.user.id },
    include: { module: true, _count: { select: { reviews: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const hasPortfolioEntries = cards.some((c) => c.status === "submitted");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Eyebrow>Мои материалы</Eyebrow>
          <h1 className="text-[32px] leading-tight font-heading font-bold text-ink">Мои работы</h1>
        </div>
        {hasPortfolioEntries ? (
          <Link href="/portfolio">
            <Button variant="secondary">AI-портфолио</Button>
          </Link>
        ) : null}
      </div>

      {cards.length === 0 ? (
        <p className="border border-line bg-white/60 px-5 py-6 text-[15px] text-muted">
          Пока нет ни одной сданной работы.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {cards.map((card) => {
            const title = titleForCard(card.kind, card.cardJson);
            return (
              <Link
                key={card.id}
                href={`/cards/${card.id}`}
                className="tap-target flex items-center justify-between border border-line bg-white/60 px-5 py-5 hover:border-forest"
              >
                <div>
                  <p className="text-[13px] uppercase tracking-[.08em] text-muted">{card.module.title}</p>
                  <p className="mt-1 text-[19px] font-heading font-semibold text-ink">{title}</p>
                  {card.status === "submitted" ? (
                    <p className="mt-1 text-[13px] text-muted">Рецензий получено: {card._count.reviews}</p>
                  ) : null}
                </div>
                <span className="text-[13px] uppercase tracking-[.08em] text-muted">
                  {card.status === "draft" ? "Черновик" : "Отправлена"}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
