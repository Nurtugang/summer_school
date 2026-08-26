import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Eyebrow } from "@/components/ui";
import { QuizRunner } from "@/components/QuizRunner";
import { QuizBreakdown } from "@/components/QuizBreakdown";
import { ensureQuestionsForUser, sanitizeQuestion, type BreakdownItem } from "@/lib/quiz";
import { MAX_QUIZ_ATTEMPTS, QUIZ_MODULE_CONTEXT } from "@/lib/config";

export default async function QuizPage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [moduleRecord, user] = await Promise.all([
    prisma.module.findUnique({ where: { id: moduleId }, include: { day: true } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { specialization: true } }),
  ]);
  if (!moduleRecord || !user) notFound();

  const theoryCount = await prisma.question.count({
    where: { moduleId, userId: null, type: "theory_closed" },
  });
  if (theoryCount === 0) notFound();

  const attempts = await prisma.quizAttempt.findMany({
    where: { userId: session.user.id, moduleId },
    orderBy: { scorePercent: "desc" },
  });
  const attemptsRemaining = MAX_QUIZ_ATTEMPTS - attempts.length;

  const questions =
    attemptsRemaining > 0
      ? await ensureQuestionsForUser(
          moduleId,
          session.user.id,
          user.specialization,
          QUIZ_MODULE_CONTEXT[moduleRecord.order] ?? moduleRecord.title
        )
      : [];

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Главная", href: "/" },
          { label: `День ${moduleRecord.day.number}`, href: `/days/${moduleRecord.day.number}` },
          { label: moduleRecord.title, href: `/modules/${moduleRecord.id}` },
          { label: "Тест" },
        ]}
      />

      <div>
        <Eyebrow>Тест</Eyebrow>
        <h1 className="text-[32px] leading-tight font-heading font-bold text-ink">{moduleRecord.title}</h1>
        <p className="mt-1 text-[13px] text-muted">
          Практические вопросы подобраны под ваше направление: {user.specialization}
        </p>
      </div>

      {attemptsRemaining > 0 ? (
        <QuizRunner
          moduleId={moduleId}
          questions={questions.map((q) => sanitizeQuestion(q))}
          attemptsRemaining={attemptsRemaining}
          maxAttempts={MAX_QUIZ_ATTEMPTS}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-[15px] text-muted">
            Попытки закончились ({MAX_QUIZ_ATTEMPTS} из {MAX_QUIZ_ATTEMPTS}). Показан лучший результат.
          </p>
          <QuizBreakdown
            scorePercent={attempts[0].scorePercent}
            status={attempts[0].status as "scored" | "pending_review"}
            breakdown={attempts[0].breakdownJson as unknown as BreakdownItem[]}
          />
        </div>
      )}
    </div>
  );
}
