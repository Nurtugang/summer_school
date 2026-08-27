import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAX_REVIEWS_PER_USER } from "@/lib/config";
import type { TriadJson, TaskSetJson } from "@/lib/gemini";

const NO_REVIEW_KINDS = ["case_prompt", "pentagram_prompt", "notebook_log"];

export async function GET(_req: Request, { params }: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { _count: { select: { reviews: true } } },
  });
  if (
    !card ||
    card.status !== "submitted" ||
    card.userId === session.user.id ||
    NO_REVIEW_KINDS.includes(card.kind)
  ) {
    return NextResponse.json({ error: "Карта недоступна" }, { status: 404 });
  }

  const myReview = await prisma.review.findUnique({
    where: { cardId_reviewerId: { cardId, reviewerId: session.user.id } },
  });

  return NextResponse.json({
    card: card.cardJson as unknown as TriadJson | TaskSetJson,
    kind: card.kind,
    reviewCount: card._count.reviews,
    reviewedByMe: !!myReview,
  });
}

const reviewSchema = z.object({
  alignmentScore: z.number().int().min(1).max(5),
  resilienceScore: z.number().int().min(1).max(5),
  alignmentNote: z.string().optional(),
  resilienceNote: z.string().optional(),
  weakestLink: z.string().min(1),
});

export async function POST(req: Request, { params }: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card || card.status !== "submitted" || NO_REVIEW_KINDS.includes(card.kind)) {
    return NextResponse.json({ error: "Карта недоступна для рецензии" }, { status: 404 });
  }
  if (card.userId === session.user.id) {
    return NextResponse.json({ error: "Нельзя рецензировать свою карту" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  if (parsed.data.alignmentScore <= 2 && !parsed.data.alignmentNote?.trim()) {
    return NextResponse.json({ error: "Укажите, в чём разрыв по первому критерию" }, { status: 400 });
  }
  if (parsed.data.resilienceScore <= 2 && !parsed.data.resilienceNote?.trim()) {
    return NextResponse.json({ error: "Укажите, в чём разрыв по второму критерию" }, { status: 400 });
  }

  const existing = await prisma.review.findUnique({
    where: { cardId_reviewerId: { cardId, reviewerId: session.user.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "Вы уже оставили рецензию на эту карту" }, { status: 400 });
  }

  const givenCount = await prisma.review.count({ where: { reviewerId: session.user.id } });
  if (givenCount >= MAX_REVIEWS_PER_USER) {
    return NextResponse.json({ error: "Лимит рецензий исчерпан" }, { status: 400 });
  }

  await prisma.review.create({
    data: {
      cardId,
      reviewerId: session.user.id,
      alignmentScore: parsed.data.alignmentScore,
      resilienceScore: parsed.data.resilienceScore,
      alignmentNote: parsed.data.alignmentNote || null,
      resilienceNote: parsed.data.resilienceNote || null,
      weakestLink: parsed.data.weakestLink,
    },
  });

  return NextResponse.json({ ok: true });
}
