import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { PentagramInput, TaskSetJson } from "@/lib/gemini";

const schema = z.object({
  moduleId: z.string().min(1),
  persona: z.string().min(1),
  context: z.string().min(1),
  task: z.string().min(1),
  output: z.string().min(1),
  constraint: z.string().min(1, "Опишите, что помешает списать задание у ИИ"),
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
  if (!moduleRecord || !moduleRecord.hasTaskWizard) {
    return NextResponse.json({ error: "Модуль не поддерживает создание комплекта заданий" }, { status: 400 });
  }

  const existing = await prisma.card.findUnique({
    where: { userId_moduleId_kind: { userId: session.user.id, moduleId: moduleRecord.id, kind: "task_set" } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "У вас уже есть работа по этому модулю — удалите её, чтобы начать заново." },
      { status: 400 }
    );
  }

  const pentagram: PentagramInput = {
    persona: parsed.data.persona,
    context: parsed.data.context,
    task: parsed.data.task,
    output: parsed.data.output,
    constraint: parsed.data.constraint,
  };

  const taskSet: TaskSetJson = {
    pentagram,
    promptChallenges: [],
    promptCheckedSnapshot: null,
    promptResponses: [],
    rows: [],
    flags: [],
    recheckFlags: null,
    generated: false,
  };

  const card = await prisma.card.create({
    data: {
      userId: session.user.id,
      moduleId: moduleRecord.id,
      kind: "task_set",
      contextJson: pentagram as unknown as Prisma.InputJsonValue,
      draftJson: taskSet as unknown as Prisma.InputJsonValue,
      cardJson: taskSet as unknown as Prisma.InputJsonValue,
      status: "draft",
    },
  });

  return NextResponse.json({ id: card.id });
}
