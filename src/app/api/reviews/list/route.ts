import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAX_REVIEWS_PER_USER } from "@/lib/config";
import { titleForCard } from "@/lib/cardTitle";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const [cards, meGiven] = await Promise.all([
    prisma.card.findMany({
      where: {
        status: "submitted",
        userId: { not: session.user.id },
        kind: { notIn: ["case_prompt", "pentagram_prompt", "notebook_log"] },
      },
      include: {
        module: true,
        _count: { select: { reviews: true } },
        reviews: { where: { reviewerId: session.user.id }, select: { id: true } },
      },
      orderBy: [{ createdAt: "asc" }],
    }),
    prisma.review.count({ where: { reviewerId: session.user.id } }),
  ]);

  const items = cards
    .map((card) => ({
      id: card.id,
      title: titleForCard(card.kind, card.cardJson),
      moduleTitle: card.module.title,
      reviewCount: card._count.reviews,
      reviewedByMe: card.reviews.length > 0,
    }))
    .sort((a, b) => a.reviewCount - b.reviewCount);

  return NextResponse.json({
    meGiven,
    meLimit: MAX_REVIEWS_PER_USER,
    cards: items,
  });
}
