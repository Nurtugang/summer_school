import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const card = await prisma.card.findUnique({ where: { id } });
  if (!card || card.userId !== session.user.id) {
    return NextResponse.json({ error: "Работа не найдена" }, { status: 404 });
  }
  if (card.status !== "draft") {
    return NextResponse.json({ error: "Работа уже отправлена" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  await prisma.card.update({
    where: { id },
    data: { cardJson: body as Prisma.InputJsonValue },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const card = await prisma.card.findUnique({ where: { id } });
  if (!card || card.userId !== session.user.id) {
    return NextResponse.json({ error: "Работа не найдена" }, { status: 404 });
  }

  await prisma.review.deleteMany({ where: { cardId: id } });
  await prisma.card.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
