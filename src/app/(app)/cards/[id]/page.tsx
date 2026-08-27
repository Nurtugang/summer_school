import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Eyebrow } from "@/components/ui";
import { TriadEditor } from "@/components/TriadEditor";
import { TaskSetEditor } from "@/components/TaskSetEditor";
import { TutorPromptEditor } from "@/components/TutorPromptEditor";
import { normalizeTaskSet } from "@/lib/taskSetFlow";
import type { TutorCardJson } from "@/lib/tutorPrompt";
import type { CardCritique, TriadJson } from "@/lib/gemini";
import { dayLabel } from "@/lib/dayLabel";

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
  const title = isTaskSet
    ? "Комплект заданий"
    : isTutorPrompt
      ? "Тьютор для домашней подготовки"
      : (card.cardJson as unknown as TriadJson).header.topic || "Занятие";
  const critique = card.critiqueJson as unknown as CardCritique | null;
  const breadcrumbLabel = isTaskSet ? "Комплект заданий" : isTutorPrompt ? "Тьютор" : "Занятие";
  const statusLabel = card.status === "draft" ? "Черновик" : isTutorPrompt ? "Готово" : "Отправлена на рецензию";

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
        <TutorPromptEditor
          cardId={card.id}
          moduleId={card.module.id}
          initialCard={card.cardJson as unknown as TutorCardJson}
          status={card.status}
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
