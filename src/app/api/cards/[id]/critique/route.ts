import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reactToTriadFix, GeminiResponseError } from "@/lib/gemini";
import type { TriadJson } from "@/lib/gemini";
import { changedOrRespondedSinceCheck } from "@/lib/triad";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const card = await prisma.card.findUnique({ where: { id } });
  if (!card || card.userId !== session.user.id || card.kind !== "alignment_card") {
    return NextResponse.json({ error: "Карта не найдена" }, { status: 404 });
  }
  if (card.status !== "draft") {
    return NextResponse.json({ error: "Карта уже отправлена" }, { status: 400 });
  }

  // «Проверь меня»: реакция на правки/ответы после стресс-теста триады
  const triad = card.cardJson as unknown as TriadJson;
  if (!triad.checkedSnapshot || triad.challenges.length === 0) {
    return NextResponse.json({ error: "Сначала пройдите «Проверку на согласованность»" }, { status: 400 });
  }
  if (!changedOrRespondedSinceCheck(triad.checkedSnapshot, triad, triad.responses)) {
    return NextResponse.json(
      { error: "Измените хотя бы одно поле или ответьте на все вопросы" },
      { status: 400 }
    );
  }

  try {
    const critique = await reactToTriadFix(triad.challenges, triad.checkedSnapshot, triad, triad.responses);
    await prisma.card.update({
      where: { id },
      data: { critiqueJson: critique as unknown as Prisma.InputJsonValue },
    });
    return NextResponse.json({ critique, unavailable: false });
  } catch (err) {
    if (err instanceof GeminiResponseError) {
      try {
        const critique = await reactToTriadFix(triad.challenges, triad.checkedSnapshot, triad, triad.responses);
        await prisma.card.update({
          where: { id },
          data: { critiqueJson: critique as unknown as Prisma.InputJsonValue },
        });
        return NextResponse.json({ critique, unavailable: false });
      } catch {
        return NextResponse.json({ critique: null, unavailable: true });
      }
    }
    return NextResponse.json({ critique: null, unavailable: true });
  }
}
