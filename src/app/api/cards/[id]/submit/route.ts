import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { TriadJson } from "@/lib/gemini";
import { canSubmitTriad, triadFieldsFilled } from "@/lib/triad";
import { canSubmitTaskSet, normalizeTaskSet } from "@/lib/taskSetFlow";
import { canSubmitCasePrompt, type CaseCardJson } from "@/lib/caseAssemblyPrompt";
import { canSubmitPentagramPrompt, type PentagramCardJson } from "@/lib/pentagramPrompt";
import { canSubmitNotebookLog, type NotebookCardJson } from "@/lib/notebookLog";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const card = await prisma.card.findUnique({ where: { id } });
  if (!card || card.userId !== session.user.id) {
    return NextResponse.json({ error: "Карта не найдена" }, { status: 404 });
  }
  if (card.status !== "draft") {
    return NextResponse.json({ error: "Карта уже отправлена" }, { status: 400 });
  }

  if (card.kind === "task_set") {
    const taskSet = normalizeTaskSet(card.cardJson);
    const draft = normalizeTaskSet(card.draftJson);
    if (!canSubmitTaskSet(taskSet, draft.rows)) {
      const label = !taskSet.generated
        ? "Сначала сгенерируйте комплект заданий"
        : taskSet.flags.some((f) => f.cheatable)
          ? "Перепишите все задания, помеченные «списывается в ИИ»"
          : "Закалите вручную хотя бы одно задание уровня Анализ / Оценка / Создание";
      return NextResponse.json({ error: label }, { status: 400 });
    }
  } else if (card.kind === "case_prompt") {
    const caseCard = card.cardJson as unknown as CaseCardJson;
    if (!canSubmitCasePrompt(caseCard)) {
      return NextResponse.json(
        { error: "Замените все плейсхолдеры и хотя бы раз нажмите «Сгенерировать»" },
        { status: 400 }
      );
    }
  } else if (card.kind === "pentagram_prompt") {
    const pentagram = card.cardJson as unknown as PentagramCardJson;
    if (!canSubmitPentagramPrompt(pentagram)) {
      return NextResponse.json(
        { error: "Замените все плейсхолдеры и хотя бы раз нажмите «Сгенерировать»" },
        { status: 400 }
      );
    }
  } else if (card.kind === "notebook_log") {
    const notebook = card.cardJson as unknown as NotebookCardJson;
    if (!canSubmitNotebookLog(notebook)) {
      return NextResponse.json(
        { error: "Заполните, что получили от NotebookLM, по каждому промпту" },
        { status: 400 }
      );
    }
  } else {
    const triad = card.cardJson as unknown as TriadJson;
    if (!triadFieldsFilled(triad)) {
      return NextResponse.json(
        { error: "Заполните все три поля триады содержательно" },
        { status: 400 }
      );
    }
    if (triad.challenges.length === 0) {
      return NextResponse.json(
        { error: "Сначала пройдите «Проверку на согласованность»" },
        { status: 400 }
      );
    }
    if (!canSubmitTriad(triad, triad.checkedSnapshot, triad.responses, triad.challenges.length > 0)) {
      return NextResponse.json(
        { error: "После проверки измените хотя бы одно поле или ответьте на все вопросы" },
        { status: 400 }
      );
    }
  }

  await prisma.card.update({ where: { id }, data: { status: "submitted" } });

  return NextResponse.json({ ok: true });
}
