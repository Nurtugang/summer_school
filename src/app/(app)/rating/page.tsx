import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Eyebrow } from "@/components/ui";
import { cardComponent, cardScoreForCard, quizComponent, teacherRating } from "@/lib/rating";

export default async function RatingPage() {
  const session = await auth();

  const users = await prisma.user.findMany({
    include: {
      cards: { where: { status: "submitted" }, include: { reviews: true } },
      quizAttempts: { select: { moduleId: true, scorePercent: true, breakdownJson: true } },
      diagnosticAttempts: { select: { moduleId: true, scorePercent: true, breakdownJson: true } },
      _count: { select: { reviewsGiven: true } },
    },
  });

  const leaderboard = users
    .map((user) => {
      const cardScores = user.cards.map((c) => cardScoreForCard(c.kind, c.reviews));
      const quiz = quizComponent(user.quizAttempts, user.diagnosticAttempts);
      const card = cardComponent(cardScores);
      const rating = teacherRating({ quizComponent: quiz, cardComponent: card, reviewsGiven: user._count.reviewsGiven });
      const scoredCards = cardScores.filter((s): s is number => s !== null);
      const avgCardRaw = scoredCards.length ? scoredCards.reduce((a, b) => a + b, 0) / scoredCards.length : null;

      return {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        department: user.department,
        quizPercent: quiz,
        cardScore: avgCardRaw,
        reviewsGiven: user._count.reviewsGiven,
        total: rating.total,
      };
    })
    .sort((a, b) => b.total - a.total);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Eyebrow>Итоги</Eyebrow>
        <h1 className="text-[32px] leading-tight font-heading font-bold text-ink">Рейтинг</h1>
        <p className="mt-1 text-[13px] text-muted">
          Итог = 0.4 × балл тестов + 0.5 × балл карт + 0.1 × рецензии
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {leaderboard.map((row, i) => {
          const isMe = row.id === session?.user?.id;
          return (
            <div
              key={row.id}
              className={`flex flex-col gap-3 border px-4 py-4 ${
                isMe ? "border-forest bg-mint" : "border-line bg-white/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 text-[15px] text-muted">{i + 1}</span>
                  <div>
                    <p className="text-[16px] font-medium text-ink">{row.name}</p>
                    <p className="text-[13px] text-muted">{row.department}</p>
                  </div>
                </div>
                <span className="text-[22px] font-heading font-semibold text-forest">
                  {row.total.toFixed(1)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
                <div>
                  <p className="text-[11px] uppercase tracking-[.06em] text-muted">Тесты</p>
                  <p className="text-[15px] text-ink">{row.quizPercent.toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[.06em] text-muted">Работы</p>
                  <p className="text-[15px] text-ink">
                    {row.cardScore !== null ? `${row.cardScore.toFixed(1)}/5` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[.06em] text-muted">Рецензий сдано</p>
                  <p className="text-[15px] text-ink">{row.reviewsGiven}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
