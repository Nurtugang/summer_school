import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Eyebrow } from "@/components/ui";
import { DiagnosticRunner } from "@/components/DiagnosticRunner";
import { DiagnosticBreakdown } from "@/components/DiagnosticBreakdown";
import { ensureDiagnosticTasksForUser, sanitizeDiagnosticTask, type DiagnosticBreakdownItem } from "@/lib/diagnostic";
import { MAX_QUIZ_ATTEMPTS } from "@/lib/config";

export default async function DiagnosticPage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [moduleRecord, user] = await Promise.all([
    prisma.module.findUnique({ where: { id: moduleId }, include: { day: true } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { specialization: true } }),
  ]);
  if (!moduleRecord || !user) notFound();

  const globalTaskCount = await prisma.diagnosticTask.count({ where: { moduleId, userId: null } });
  if (globalTaskCount === 0) notFound();

  const attempts = await prisma.diagnosticAttempt.findMany({
    where: { userId: session.user.id, moduleId },
    orderBy: { scorePercent: "desc" },
  });
  const attemptsRemaining = MAX_QUIZ_ATTEMPTS - attempts.length;

  const tasks =
    attemptsRemaining > 0 ? await ensureDiagnosticTasksForUser(moduleId, session.user.id, user.specialization) : [];

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Главная", href: "/" },
          { label: `День ${moduleRecord.day.number}`, href: `/days/${moduleRecord.day.number}` },
          { label: moduleRecord.title, href: `/modules/${moduleRecord.id}` },
          { label: "Диагностика резистентности" },
        ]}
      />

      <div>
        <Eyebrow>Диагностика резистентности</Eyebrow>
        <h1 className="text-[32px] leading-tight font-heading font-bold text-ink">{moduleRecord.title}</h1>
        <p className="mt-1 text-[15px] text-muted">
          Ниже — готовый комплект заданий по уровням Блума, подобранный под ваше направление (
          {user.specialization}). У части заявлен высокий уровень, но на деле задание списывается в ИИ в
          один клик. Найдите такие и объясните, как их починить.
        </p>
      </div>

      {attemptsRemaining > 0 ? (
        <DiagnosticRunner
          moduleId={moduleId}
          tasks={tasks.map((t) => sanitizeDiagnosticTask(t))}
          attemptsRemaining={attemptsRemaining}
          maxAttempts={MAX_QUIZ_ATTEMPTS}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-[15px] text-muted">
            Попытки закончились ({MAX_QUIZ_ATTEMPTS} из {MAX_QUIZ_ATTEMPTS}). Показан лучший результат.
          </p>
          <DiagnosticBreakdown
            scorePercent={attempts[0].scorePercent}
            status={attempts[0].status as "scored" | "pending_review"}
            breakdown={attempts[0].breakdownJson as unknown as DiagnosticBreakdownItem[]}
          />
        </div>
      )}
    </div>
  );
}
