import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePalette, GeminiResponseError } from "@/lib/gemini";
import type { WizardInput } from "@/lib/gemini";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const card = await prisma.card.findUnique({ where: { id } });
  if (!card || card.userId !== session.user.id || card.kind !== "alignment_card") {
    return NextResponse.json({ error: "Занятие не найдено" }, { status: 404 });
  }

  const context = card.contextJson as unknown as WizardInput;

  try {
    const palette = await generatePalette(context.course, context.materials);
    return NextResponse.json({ palette });
  } catch (err) {
    if (err instanceof GeminiResponseError) {
      try {
        const palette = await generatePalette(context.course, context.materials);
        return NextResponse.json({ palette });
      } catch {
        return NextResponse.json({ error: "Не удалось получить палитру от Gemini" }, { status: 502 });
      }
    }
    return NextResponse.json({ error: "Не удалось получить палитру от Gemini" }, { status: 502 });
  }
}
