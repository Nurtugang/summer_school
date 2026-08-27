import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Eyebrow } from "@/components/ui";
import { TriadEditor } from "@/components/TriadEditor";
import { TaskSetEditor } from "@/components/TaskSetEditor";
import { TemplatePromptEditor } from "@/components/TemplatePromptEditor";
import { NotebookLogEditor } from "@/components/NotebookLogEditor";
import { normalizeTaskSet } from "@/lib/taskSetFlow";
import { CASE_PLACEHOLDERS, CASE_PLACEHOLDER_HINTS, type CaseCardJson } from "@/lib/caseAssemblyPrompt";
import {
  PENTAGRAM_PLACEHOLDERS,
  PENTAGRAM_PLACEHOLDER_HINTS,
  type PentagramCardJson,
} from "@/lib/pentagramPrompt";
import { NOTEBOOK_MODULE_SPECS } from "@/lib/notebookPrompts";
import type { NotebookCardJson } from "@/lib/notebookLog";
import type { CardCritique, TriadJson } from "@/lib/gemini";
import { dayLabel } from "@/lib/dayLabel";

const CASE_INTRO = [
  "Инструмент «Сборка кейса» собирает за один запуск комплект материалов для дебатов/группового обсуждения на занятии: реальное спорное противоречие по вашей теме, вводный текст-кейс и два хендаута с фактами — за позицию и против.",
  "Ниже — рабочий шаблон с плейсхолдерами в квадратных скобках. Замените их на свои — дисциплину, курс, тему и то, чему студенты должны научиться.",
  "Порядок: замените плейсхолдеры → при желании приложите файлы (материалы занятия) → «Сгенерировать» — промпт реально уйдёт в Gemini и вернёт готовый комплект (противоречие → кейс → pro-хендаут → con-хендаут) → «Готово».",
];

const PENTAGRAM_INTRO = [
  "Pentagram — фреймворк системного промпта из пяти полей (Persona · Context · Task · Output · Constraint). Шаблон ниже уже готов — вписать нужно только дисциплину и уровень студентов, — и под него ИИ соберёт комплект из 6 заданий по всем уровням Блума, от Запоминания до Создания.",
  "Ключевое поле — Constraint: без него задания уровней Анализ/Оценка/Создание чаще всего решаются студентом в один клик через тот же ИИ, а с продуманным Constraint — нет. В шаблоне он уже есть, при желании можно ужесточить под свою дисциплину.",
  "Порядок: замените плейсхолдеры → при желании приложите файлы (силлабус, материалы занятия — дадут ИИ больше контекста) → «Сгенерировать» — промпт реально уйдёт в Gemini и вернёт таблицу из 6 заданий → «Готово».",
];

export default async function CardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const card = await prisma.card.findUnique({
    where: { id },
    include: { module: { include: { day: true } }, _count: { select: { reviews: true } } },
  });
  if (!card || card.userId !== session.user.id) notFound();

  const isTaskSet = card.kind === "task_set";
  const isCasePrompt = card.kind === "case_prompt";
  const isPentagramPrompt = card.kind === "pentagram_prompt";
  const isNotebookLog = card.kind === "notebook_log";
  const title = isTaskSet
    ? "Комплект заданий"
    : isCasePrompt
      ? "Сборка кейса"
      : isPentagramPrompt
        ? "Pentagram-тренажёр"
        : isNotebookLog
          ? "Работа с NotebookLM"
          : (card.cardJson as unknown as TriadJson).header.topic || "Занятие";
  const critique = card.critiqueJson as unknown as CardCritique | null;
  const breadcrumbLabel = isTaskSet
    ? "Комплект заданий"
    : isCasePrompt
      ? "Сборка кейса"
      : isPentagramPrompt
        ? "Pentagram"
        : isNotebookLog
          ? "NotebookLM"
          : "Занятие";
  const noReviewSubmitted = isCasePrompt || isPentagramPrompt || isNotebookLog;
  const statusLabel = card.status === "draft" ? "Черновик" : noReviewSubmitted ? "Готово" : "Отправлена на рецензию";

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Главная", href: "/" },
          { label: dayLabel(card.module.day.number), href: `/days/${card.module.day.number}` },
          { label: card.module.title, href: `/modules/${card.module.id}` },
          { label: breadcrumbLabel },
        ]}
      />

      <div>
        <Eyebrow>{statusLabel}</Eyebrow>
        <h1 className="text-[32px] leading-tight font-heading font-bold text-ink">{title}</h1>
      </div>

      {isTaskSet ? (
        <TaskSetEditor
          cardId={card.id}
          moduleId={card.module.id}
          initialCard={normalizeTaskSet(card.cardJson)}
          draftCard={normalizeTaskSet(card.draftJson)}
          status={card.status}
          reviewCount={card._count.reviews}
        />
      ) : isCasePrompt ? (
        <TemplatePromptEditor
          cardId={card.id}
          moduleId={card.module.id}
          status={card.status}
          initialCard={card.cardJson as unknown as CaseCardJson}
          placeholders={CASE_PLACEHOLDERS}
          placeholderHints={CASE_PLACEHOLDER_HINTS}
          generateEndpoint={`/api/cards/${card.id}/case-generate`}
          generateButtonLabel="Сгенерировать"
          generatingLabel="Генерируем…"
          resultLabel="Комплект материалов"
          introTitle="Что это и зачем"
          introBody={CASE_INTRO}
          downloadFileName="case-prompt.txt"
        />
      ) : isPentagramPrompt ? (
        <TemplatePromptEditor
          cardId={card.id}
          moduleId={card.module.id}
          status={card.status}
          initialCard={card.cardJson as unknown as PentagramCardJson}
          placeholders={PENTAGRAM_PLACEHOLDERS}
          placeholderHints={PENTAGRAM_PLACEHOLDER_HINTS}
          generateEndpoint={`/api/cards/${card.id}/pentagram-generate`}
          generateButtonLabel="Сгенерировать"
          generatingLabel="Генерируем…"
          resultLabel="Результат генерации"
          introTitle="Что это и зачем"
          introBody={PENTAGRAM_INTRO}
          downloadFileName="pentagram-prompt.txt"
        />
      ) : isNotebookLog ? (
        <NotebookLogEditor
          cardId={card.id}
          moduleId={card.module.id}
          status={card.status}
          initialCard={card.cardJson as unknown as NotebookCardJson}
          introLines={NOTEBOOK_MODULE_SPECS[card.module.order]?.intro ?? []}
          examples={(NOTEBOOK_MODULE_SPECS[card.module.order]?.prompts ?? []).map((p) => p.example)}
        />
      ) : (
        <TriadEditor
          cardId={card.id}
          moduleId={card.module.id}
          initialCard={card.cardJson as unknown as TriadJson}
          critique={critique}
          status={card.status}
          reviewCount={card._count.reviews}
        />
      )}
    </div>
  );
}
