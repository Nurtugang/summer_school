import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PENTAGRAM_PROMPT_TEMPLATE, type PentagramCardJson } from "@/lib/pentagramPrompt";

const schema = z.object({
  moduleId: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const moduleRecord = await prisma.module.findUnique({ where: { id: parsed.data.moduleId } });
  if (!moduleRecord || !moduleRecord.hasPentagramWizard) {
    return NextResponse.json({ error: "Модуль не поддерживает создание этого задания" }, { status: 400 });
  }

  const existing = await prisma.card.findUnique({
    where: {
      userId_moduleId_kind: { userId: session.user.id, moduleId: moduleRecord.id, kind: "pentagram_prompt" },
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: "У вас уже есть работа по этому модулю — удалите её, чтобы начать заново." },
      { status: 400 }
    );
  }

  const initial: PentagramCardJson = {
    promptText: PENTAGRAM_PROMPT_TEMPLATE,
    files: [],
    result: null,
    generated: false,
  };

  const card = await prisma.card.create({
    data: {
      userId: session.user.id,
      moduleId: moduleRecord.id,
      kind: "pentagram_prompt",
      contextJson: {} as unknown as Prisma.InputJsonValue,
      draftJson: initial as unknown as Prisma.InputJsonValue,
      cardJson: initial as unknown as Prisma.InputJsonValue,
      status: "draft",
    },
  });

  return NextResponse.json({ id: card.id });
}
