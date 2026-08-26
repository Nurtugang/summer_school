import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tutorReply } from "@/lib/gemini";
import type { TutorCardJson } from "@/lib/tutorPrompt";

const schema = z.object({
  message: z.string().min(1),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const card = await prisma.card.findUnique({ where: { id } });
  if (!card || card.userId !== session.user.id || card.kind !== "tutor_prompt") {
    return NextResponse.json({ error: "Задание не найдено" }, { status: 404 });
  }
  if (card.status !== "draft") {
    return NextResponse.json({ error: "Задание уже отправлено" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const current = card.cardJson as unknown as TutorCardJson;
  const history = [...current.transcript, { role: "user" as const, text: parsed.data.message }];

  let replyText: string;
  try {
    replyText = await tutorReply(current.promptText, history);
    if (!replyText.trim()) throw new Error("empty reply");
  } catch {
    return NextResponse.json(
      { error: "Не удалось получить ответ от Gemini. Попробуйте ещё раз." },
      { status: 502 }
    );
  }

  const updated: TutorCardJson = {
    ...current,
    transcript: [...history, { role: "model" as const, text: replyText }],
  };

  await prisma.card.update({
    where: { id },
    data: { cardJson: updated as unknown as Prisma.InputJsonValue },
  });

  return NextResponse.json({ transcript: updated.transcript });
}
