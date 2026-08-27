import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Eyebrow } from "@/components/ui";
import { TriadEditor } from "@/components/TriadEditor";
import { TaskSetEditor } from "@/components/TaskSetEditor";
import { TemplatePromptEditor } from "@/components/TemplatePromptEditor";
import { normalizeTaskSet } from "@/lib/taskSetFlow";
import { TUTOR_PLACEHOLDERS, TUTOR_PLACEHOLDER_HINTS, type TutorCardJson } from "@/lib/tutorPrompt";
import {
  PENTAGRAM_PLACEHOLDERS,
  PENTAGRAM_PLACEHOLDER_HINTS,
  type PentagramCardJson,
} from "@/lib/pentagramPrompt";
import type { CardCritique, TriadJson } from "@/lib/gemini";
import { dayLabel } from "@/lib/dayLabel";

const TUTOR_INTRO = [
  "Это готовый промпт-тьютор для домашней подготовки студентов к перевёрнутому занятию (flipped classroom) — на основе AI-Tutor из Mollick & Mollick. Идея в сократовском методе: тьютор НЕ даёт студенту готовых ответов, а ведёт наводящими вопросами, пока студент не поймёт сам.",
  "Ниже — рабочий шаблон с плейсхолдерами в квадратных скобках. Замените их на свои — под конкретное занятие, тему и уровень студентов.",
  "Порядок: замените плейсхолдеры → при желании приложите файлы (материалы занятия) → «Проверить» — промпт реально уйдёт в Gemini, которая сыграет короткий пример диалога тьютора со студентом целиком (включая финальный «входной билет»), чтобы вы увидели, что тьютор ведёт вопросами, а не отвечает → «Готово» → скопируйте или скачайте промпт и отдайте студентам.",
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
  const isTutorPrompt = card.kind === "tutor_prompt";
  const isPentagramPrompt = card.kind === "pentagram_prompt";
  const title = isTaskSet
    ? "Комплект заданий"
    : isTutorPrompt
      ? "Тьютор для домашней подготовки"
      : isPentagramPrompt
        ? "Pentagram-тренажёр"
        : (card.cardJson as unknown as TriadJson).header.topic || "Занятие";
  const critique = card.critiqueJson as unknown as CardCritique | null;
  const breadcrumbLabel = isTaskSet
    ? "Комплект заданий"
    : isTutorPrompt
      ? "Тьютор"
      : isPentagramPrompt
        ? "Pentagram"
        : "Занятие";
  const statusLabel =
    card.status === "draft" ? "Черновик" : isTutorPrompt || isPentagramPrompt ? "Готово" : "Отправлена на рецензию";

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
      ) : isTutorPrompt ? (
        <TemplatePromptEditor
          cardId={card.id}
          moduleId={card.module.id}
          status={card.status}
          initialCard={card.cardJson as unknown as TutorCardJson}
          placeholders={TUTOR_PLACEHOLDERS}
          placeholderHints={TUTOR_PLACEHOLDER_HINTS}
          generateEndpoint={`/api/cards/${card.id}/tutor-generate`}
          generateButtonLabel="Проверить"
          generatingLabel="Проверяем…"
          resultLabel="Пример диалога с тьютором"
          introTitle="Что это и зачем"
          introBody={TUTOR_INTRO}
          downloadFileName="tutor-prompt.txt"
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
