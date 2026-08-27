import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button, Eyebrow } from "@/components/ui";
import { ModuleProgress, type ModuleProgressRow } from "@/components/ModuleProgress";
import { REVIEW_PROGRESS_TARGET } from "@/lib/config";
import { titleForCard } from "@/lib/cardTitle";
import { dayLabel } from "@/lib/dayLabel";

export default async function ModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const session = await auth();

  const moduleRecord = await prisma.module.findUnique({
    where: { id: moduleId },
    include: { day: true },
  });
  if (!moduleRecord) notFound();

  const [questionCount, diagnosticTaskCount] = await Promise.all([
    prisma.question.count({ where: { moduleId: moduleRecord.id, userId: null, type: "theory_closed" } }),
    prisma.diagnosticTask.count({ where: { moduleId: moduleRecord.id, userId: null } }),
  ]);

  const myCards = session?.user
    ? await prisma.card.findMany({
        where: { moduleId: moduleRecord.id, userId: session.user.id },
        include: { _count: { select: { reviews: true } } },
        orderBy: { updatedAt: "desc" },
      })
    : [];

  let quizPercent: number | null = null;
  let diagnosticPercent: number | null = null;
  if (session?.user) {
    const [quizAttempts, diagnosticAttempts] = await Promise.all([
      prisma.quizAttempt.findMany({
        where: { userId: session.user.id, moduleId: moduleRecord.id },
        select: { scorePercent: true },
      }),
      prisma.diagnosticAttempt.findMany({
        where: { userId: session.user.id, moduleId: moduleRecord.id },
        select: { scorePercent: true },
      }),
    ]);
    if (quizAttempts.length > 0) quizPercent = Math.max(...quizAttempts.map((a) => a.scorePercent));
    if (diagnosticAttempts.length > 0)
      diagnosticPercent = Math.max(...diagnosticAttempts.map((a) => a.scorePercent));
  }

  const cardStatus: "none" | "draft" | "submitted" =
    myCards.length === 0 ? "none" : myCards.some((c) => c.status === "submitted") ? "submitted" : "draft";
  const reviewCount = myCards.reduce((sum, c) => sum + c._count.reviews, 0);

  interface Assignment {
    title: string;
    description: string;
    href: string;
    buttonLabel: string;
  }

  const existingAlignmentCard = myCards.find((c) => c.kind === "alignment_card");
  const existingTaskSet = myCards.find((c) => c.kind === "task_set");
  const existingCasePrompt = myCards.find((c) => c.kind === "case_prompt");
  const existingPentagramPrompt = myCards.find((c) => c.kind === "pentagram_prompt");

  const assignments: Assignment[] = [];
  if (questionCount > 0) {
    assignments.push({
      title: "Тест",
      description: `${questionCount} вопросов: теория и практические кейсы. Несколько попыток, в рейтинг идёт лучшая.`,
      href: `/modules/${moduleRecord.id}/quiz`,
      buttonLabel: "Пройти тест",
    });
  }
  if (moduleRecord.hasWizard) {
    assignments.push(
      existingAlignmentCard
        ? {
            title: "Карта занятия",
            description: "Работа уже создана. Удалите её на странице работы, чтобы начать заново.",
            href: `/cards/${existingAlignmentCard.id}`,
            buttonLabel: "Открыть работу",
          }
        : {
            title: "Карта занятия",
            description: "ИИ-черновик → вы дорабатываете и защищаете решение → ИИ проверяет ваши правки → рецензия коллег.",
            href: `/modules/${moduleRecord.id}/wizard`,
            buttonLabel: "Создать карту занятия",
          }
    );
  }
  if (diagnosticTaskCount > 0 && moduleRecord.hasDiagnostic) {
    assignments.push({
      title: "Диагностика резистентности",
      description: "Найдите задания, которые списываются в ИИ в один клик, и объясните, как их починить.",
      href: `/modules/${moduleRecord.id}/diagnostic`,
      buttonLabel: "Пройти диагностику",
    });
  }
  if (moduleRecord.hasTaskWizard) {
    assignments.push(
      existingTaskSet
        ? {
            title: "Комплект заданий",
            description: "Работа уже создана. Удалите её на странице работы, чтобы начать заново.",
            href: `/cards/${existingTaskSet.id}`,
            buttonLabel: "Открыть работу",
          }
        : {
            title: "Комплект заданий",
            description: "ИИ-черновик по Pentagram-промпту → вы дорабатываете и защищаете решение → ИИ проверяет правки → рецензия коллег.",
            href: `/modules/${moduleRecord.id}/task-wizard`,
            buttonLabel: "Создать комплект заданий",
          }
    );
  }
  if (moduleRecord.hasCaseWizard) {
    assignments.push(
      existingCasePrompt
        ? {
            title: "Сборка кейса",
            description: "Работа уже создана. Удалите её на странице работы, чтобы начать заново.",
            href: `/cards/${existingCasePrompt.id}`,
            buttonLabel: "Открыть работу",
          }
        : {
            title: "Сборка кейса",
            description: "Готовый шаблон промпта → вы правите плейсхолдеры → один раз запускаете его в Gemini и получаете комплект материалов для дебатов на занятии.",
            href: `/modules/${moduleRecord.id}/case-wizard`,
            buttonLabel: "Создать промпт кейса",
          }
    );
  }
  if (moduleRecord.hasPentagramWizard) {
    assignments.push(
      existingPentagramPrompt
        ? {
            title: "Pentagram-тренажёр",
            description: "Работа уже создана. Удалите её на странице работы, чтобы начать заново.",
            href: `/cards/${existingPentagramPrompt.id}`,
            buttonLabel: "Открыть работу",
          }
        : {
            title: "Pentagram-тренажёр",
            description: "Готовый шаблон Pentagram-промпта → вы правите плейсхолдеры → один раз запускаете его в Gemini и получаете 6 заданий.",
            href: `/modules/${moduleRecord.id}/pentagram-wizard`,
            buttonLabel: "Создать Pentagram-промпт",
          }
    );
  }

  const progressRows: ModuleProgressRow[] = [];
  if (questionCount > 0) {
    progressRows.push({
      label: "Тест",
      fillPercent: quizPercent ?? 0,
      valueLabel: quizPercent !== null ? `${quizPercent.toFixed(0)}%` : "не начат",
    });
  }
  if (diagnosticTaskCount > 0 && moduleRecord.hasDiagnostic) {
    progressRows.push({
      label: "Диагностика",
      fillPercent: diagnosticPercent ?? 0,
      valueLabel: diagnosticPercent !== null ? `${diagnosticPercent.toFixed(0)}%` : "не начата",
    });
  }
  const noReviewKind = moduleRecord.hasCaseWizard || moduleRecord.hasPentagramWizard;
  if (moduleRecord.hasWizard || moduleRecord.hasTaskWizard || moduleRecord.hasPentagramWizard || moduleRecord.hasCaseWizard) {
    const cardFill = cardStatus === "submitted" ? 100 : cardStatus === "draft" ? 50 : 0;
    const doneLabel = noReviewKind ? "готово" : "отправлена";
    const cardLabel = cardStatus === "submitted" ? doneLabel : cardStatus === "draft" ? "черновик" : "не начата";
    const cardLabelTitle = moduleRecord.hasTaskWizard
      ? "Комплект заданий"
      : moduleRecord.hasPentagramWizard
        ? "Pentagram-тренажёр"
        : moduleRecord.hasCaseWizard
          ? "Сборка кейса"
          : "Карта";
    progressRows.push({
      label: cardLabelTitle,
      fillPercent: cardFill,
      valueLabel: cardLabel,
    });
    if (!noReviewKind) {
      progressRows.push({
        label: "Рецензии",
        fillPercent: (Math.min(reviewCount, REVIEW_PROGRESS_TARGET) / REVIEW_PROGRESS_TARGET) * 100,
        valueLabel: `${reviewCount} получено`,
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Главная", href: "/" },
          { label: dayLabel(moduleRecord.day.number), href: `/days/${moduleRecord.day.number}` },
          { label: `Модуль ${moduleRecord.order}` },
        ]}
      />

      <div>
        <Eyebrow>Модуль {moduleRecord.order}</Eyebrow>
        <h1 className="text-[32px] leading-tight font-heading font-bold text-ink">{moduleRecord.title}</h1>
      </div>

      {session?.user ? <ModuleProgress rows={progressRows} /> : null}

      {moduleRecord.pdfUrl ? (
        <div className="flex flex-col gap-3">
          <div className="border border-line bg-white">
            <iframe src={moduleRecord.pdfUrl} title={moduleRecord.title} className="h-[70vh] w-full" />
          </div>
          <a href={moduleRecord.pdfUrl} download className="self-start">
            <Button variant="secondary">Скачать PDF</Button>
          </a>
        </div>
      ) : (
        <p className="border border-line bg-white/60 px-5 py-6 text-[15px] text-muted">
          Презентация появится позже.
        </p>
      )}

      {assignments.length === 0 ? (
        <div className="border border-line bg-mint px-5 py-6">
          <p className="text-[19px] font-heading font-semibold text-ink">Задания</p>
          <p className="mt-1 text-[15px] text-muted">Задания этого модуля появятся позже.</p>
        </div>
      ) : (
        assignments.map((a) => (
          <div key={a.title} className="border border-line bg-mint px-5 py-6">
            <p className="text-[19px] font-heading font-semibold text-ink">{a.title}</p>
            <p className="mt-1 text-[15px] text-muted">{a.description}</p>
            <Link href={a.href} className="mt-4 inline-block">
              <Button>{a.buttonLabel}</Button>
            </Link>
          </div>
        ))
      )}

      {myCards.length > 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] uppercase tracking-[.08em] text-muted">Мои работы по модулю</p>
          {myCards.map((card) => (
            <Link
              key={card.id}
              href={`/cards/${card.id}`}
              className="tap-target flex items-center justify-between border border-line bg-white/60 px-5 py-4 hover:border-forest"
            >
              <span className="text-[16px] text-ink">{titleForCard(card.kind, card.cardJson)}</span>
              <span className="text-[13px] uppercase tracking-[.08em] text-muted">
                {card.status === "draft" ? "Черновик" : "Отправлена"}
              </span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
