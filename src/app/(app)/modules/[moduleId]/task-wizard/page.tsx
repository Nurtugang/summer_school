import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Eyebrow } from "@/components/ui";
import { TaskSetWizard } from "@/components/TaskSetWizard";

export default async function TaskWizardPage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;

  const moduleRecord = await prisma.module.findUnique({
    where: { id: moduleId },
    include: { day: true },
  });
  if (!moduleRecord || !moduleRecord.hasTaskWizard) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Главная", href: "/" },
          { label: `День ${moduleRecord.day.number}`, href: `/days/${moduleRecord.day.number}` },
          { label: moduleRecord.title, href: `/modules/${moduleRecord.id}` },
          { label: "Новый комплект заданий" },
        ]}
      />

      <div>
        <Eyebrow>Pentagram-промпт</Eyebrow>
        <h1 className="text-[32px] leading-tight font-heading font-bold text-ink">Комплект заданий</h1>
      </div>

      <TaskSetWizard moduleId={moduleRecord.id} />
    </div>
  );
}
