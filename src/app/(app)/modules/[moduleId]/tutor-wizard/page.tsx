import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Eyebrow } from "@/components/ui";
import { TutorWizard } from "@/components/TutorWizard";
import { dayLabel } from "@/lib/dayLabel";

export default async function TutorWizardPage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;

  const moduleRecord = await prisma.module.findUnique({
    where: { id: moduleId },
    include: { day: true },
  });
  if (!moduleRecord || !moduleRecord.hasTutorWizard) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Главная", href: "/" },
          { label: dayLabel(moduleRecord.day.number), href: `/days/${moduleRecord.day.number}` },
          { label: moduleRecord.title, href: `/modules/${moduleRecord.id}` },
          { label: "Тьютор для домашней подготовки" },
        ]}
      />

      <div>
        <Eyebrow>Тьютор для домашней подготовки</Eyebrow>
        <h1 className="text-[32px] leading-tight font-heading font-bold text-ink">Новое задание</h1>
      </div>

      <TutorWizard moduleId={moduleRecord.id} />
    </div>
  );
}
