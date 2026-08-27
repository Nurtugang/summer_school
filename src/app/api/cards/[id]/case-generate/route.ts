import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateCaseAssemblyResult, GeminiResponseError } from "@/lib/gemini";
import type { CaseCardJson } from "@/lib/caseAssemblyPrompt";
import { remainingCasePlaceholders } from "@/lib/caseAssemblyPrompt";

const fileSchema = z.object({ fileName: z.string(), text: z.string() });
const schema = z.object({
  promptText: z.string().min(1),
  files: z.array(fileSchema).max(3),
});

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof GeminiResponseError) return await fn();
    throw err;
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const card = await prisma.card.findUnique({ where: { id } });
  if (!card || card.userId !== session.user.id || card.kind !== "case_prompt") {
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
  if (remainingCasePlaceholders(parsed.data.promptText).length > 0) {
    return NextResponse.json({ error: "Замените все плейсхолдеры перед генерацией" }, { status: 400 });
  }

  let result: string;
  try {
    result = await withRetry(() => generateCaseAssemblyResult(parsed.data.promptText, parsed.data.files));
    if (!result.trim()) throw new Error("empty result");
  } catch {
    return NextResponse.json(
      { error: "Не удалось получить ответ от Gemini. Попробуйте ещё раз." },
      { status: 502 }
    );
  }

  const updated: CaseCardJson = {
    promptText: parsed.data.promptText,
    files: parsed.data.files,
    result,
    generated: true,
  };

  await prisma.card.update({
    where: { id },
    data: { cardJson: updated as unknown as Prisma.InputJsonValue },
  });

  return NextResponse.json({ result });
}
