import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkCoherence, GeminiResponseError } from "@/lib/gemini";
import type { TriadJson, WizardInput } from "@/lib/gemini";
import { triadFieldsFilled } from "@/lib/triad";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const card = await prisma.card.findUnique({ where: { id } });
  if (!card || card.userId !== session.user.id || card.kind !== "alignment_card") {
    return NextResponse.json({ error: "Занятие не найдено" }, { status: 404 });
  }
  if (card.status !== "draft") {
    return NextResponse.json({ error: "Занятие уже отправлено" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const schema = z.object({ outcome: z.string(), assessment: z.string(), activity: z.string() });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }
  if (!triadFieldsFilled(parsed.data)) {
    return NextResponse.json(
      { error: "Заполните все три поля триады содержательно перед проверкой" },
      { status: 400 }
    );
  }

  const context = card.contextJson as unknown as WizardInput;
  const current = card.cardJson as unknown as TriadJson;

  let challenges;
  try {
    challenges = await checkCoherence(parsed.data, context.course, context.materials);
  } catch (err) {
    if (err instanceof GeminiResponseError) {
      try {
        challenges = await checkCoherence(parsed.data, context.course, context.materials);
      } catch {
        return NextResponse.json({ error: "Не удалось получить проверку от Gemini. Попробуйте ещё раз." }, { status: 502 });
      }
    } else {
      return NextResponse.json({ error: "Не удалось получить проверку от Gemini. Попробуйте ещё раз." }, { status: 502 });
    }
  }

  const updated: TriadJson = {
    ...current,
    outcome: parsed.data.outcome,
    assessment: parsed.data.assessment,
    activity: parsed.data.activity,
    challenges,
    checkedSnapshot: { ...parsed.data },
    responses: challenges.map((c) => ({ question: c.question, axis: c.axis, answer: "" })),
  };

  await prisma.card.update({
    where: { id },
    data: { cardJson: updated as unknown as Prisma.InputJsonValue, critiqueJson: Prisma.JsonNull },
  });

  return NextResponse.json({ challenges, checkedSnapshot: updated.checkedSnapshot, responses: updated.responses });
}
