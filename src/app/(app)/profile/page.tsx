import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Eyebrow, Panel } from "@/components/ui";
import { cardComponent, cardScoreForCard, quizComponent, teacherRating } from "@/lib/rating";
import { titleForCard } from "@/lib/cardTitle";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      cards: { include: { reviews: true }, orderBy: { updatedAt: "desc" } },
      quizAttempts: { select: { moduleId: true, scorePercent: true, breakdownJson: true } },
      diagnosticAttempts: { select: { moduleId: true, scorePercent: true, breakdownJson: true } },
      _count: { select: { reviewsGiven: true } },
    },
  });
  if (!user) redirect("/login");

  const cardScores = user.cards
    .filter((c) => c.status === "submitted")
    .map((c) => cardScoreForCard(c.kind, c.reviews));
  const scoredCardValues = cardScores.filter((s): s is number => s !== null);
  const avgCardScore = scoredCardValues.length
    ? scoredCardValues.reduce((a, b) => a + b, 0) / scoredCardValues.length
    : null;
  const quizComponentValue = quizComponent(user.quizAttempts, user.diagnosticAttempts);
  const cardComponentValue = cardComponent(cardScores);
  const rating = teacherRating({
    quizComponent: quizComponentValue,
    cardComponent: cardComponentValue,
    reviewsGiven: user._count.reviewsGiven,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Eyebrow>Профиль</Eyebrow>
        <h1 className="text-[32px] leading-tight font-heading font-bold text-ink">
          {user.firstName} {user.lastName}
        </h1>
      </div>

      <Panel className="flex flex-col gap-1.5 text-[15px]">
        <p className="text-ink">{user.department}</p>
        <p className="text-muted">{user.specialization}</p>
        <p className="text-muted">{user.university}</p>
        <p className="text-muted">{user.email}</p>
      </Panel>

      <div className="flex flex-col gap-3 border border-forest bg-mint px-5 py-5">
        <div className="flex items-center justify-between">
          <span className="text-[16px] text-ink">Итог в рейтинге</span>
          <span className="text-[26px] font-heading font-semibold text-forest">{rating.total.toFixed(1)}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
          <div>
            <p className="text-[11px] uppercase tracking-[.06em] text-muted">Тесты</p>
            <p className="text-[15px] text-ink">{quizComponentValue.toFixed(0)}%</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[.06em] text-muted">Работы</p>
            <p className="text-[15px] text-ink">{avgCardScore !== null ? `${avgCardScore.toFixed(1)}/5` : "—"}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[.06em] text-muted">Рецензий сдано</p>
            <p className="text-[15px] text-ink">{user._count.reviewsGiven}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-[13px] uppercase tracking-[.08em] text-muted">Мои работы</p>
        {user.cards.length === 0 ? (
          <p className="border border-line bg-white/60 px-5 py-6 text-[15px] text-muted">Пока нет работ.</p>
        ) : (
          user.cards.map((card) => {
            const title = titleForCard(card.kind, card.cardJson);
            const score = card.status === "submitted" ? cardScoreForCard(card.kind, card.reviews) : null;
            return (
              <Link
                key={card.id}
                href={`/cards/${card.id}`}
                className="tap-target flex items-center justify-between border border-line bg-white/60 px-5 py-4 hover:border-forest"
              >
                <span className="text-[16px] text-ink">{title}</span>
                <span className="text-[13px] uppercase tracking-[.08em] text-muted">
                  {card.status === "draft"
                    ? "Черновик"
                    : score !== null
                      ? `Балл: ${score.toFixed(1)}/5`
                      : "Ожидает рецензий"}
                </span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
