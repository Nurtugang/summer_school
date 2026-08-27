import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { TriadJson } from "@/lib/gemini";

const schema = z.object({
  moduleId: z.string().min(1),
  course: z.object({
    title: z.string().min(1),
    level: z.string().min(1),
    modality: z.string().min(1),
    sessionLength: z.string().min(1),
    priorPrep: z.string(),
  }),
  materials: z.array(z.object({ fileName: z.string(), text: z.string() })).max(3),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Некорректные данные" },
      { status: 400 }
    );
  }

  const moduleRecord = await prisma.module.findUnique({ where: { id: parsed.data.moduleId } });
  if (!moduleRecord || !moduleRecord.hasWizard) {
    return NextResponse.json({ error: "Модуль не поддерживает создание занятия" }, { status: 400 });
  }

  const existing = await prisma.card.findUnique({
    where: {
      userId_moduleId_kind: { userId: session.user.id, moduleId: moduleRecord.id, kind: "alignment_card" },
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: "У вас уже есть работа по этому модулю — удалите её, чтобы начать заново." },
      { status: 400 }
    );
  }

  const triad: TriadJson = {
    header: {
      topic: parsed.data.course.title,
      level: parsed.data.course.level,
      duration: parsed.data.course.sessionLength,
    },
    outcome: "",
    assessment: "",
    activity: "",
    challenges: [],
    checkedSnapshot: null,
    responses: [],
  };

  const card = await prisma.card.create({
    data: {
      userId: session.user.id,
      moduleId: moduleRecord.id,
      kind: "alignment_card",
      contextJson: parsed.data as unknown as Prisma.InputJsonValue,
      draftJson: triad as unknown as Prisma.InputJsonValue,
      cardJson: triad as unknown as Prisma.InputJsonValue,
      status: "draft",
    },
  });

  return NextResponse.json({ id: card.id });
}
