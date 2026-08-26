import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Eyebrow } from "@/components/ui";
import { Wizard } from "@/components/Wizard";

export default async function WizardPage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;

  const moduleRecord = await prisma.module.findUnique({
    where: { id: moduleId },
    include: { day: true },
  });
  if (!moduleRecord || !moduleRecord.hasWizard) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Главная", href: "/" },
          { label: `День ${moduleRecord.day.number}`, href: `/days/${moduleRecord.day.number}` },
          { label: moduleRecord.title, href: `/modules/${moduleRecord.id}` },
          { label: "Новая карта" },
        ]}
      />

      <div>
        <Eyebrow>Обратный дизайн</Eyebrow>
        <h1 className="text-[32px] leading-tight font-heading font-bold text-ink">Карта занятия</h1>
      </div>

      <Wizard moduleId={moduleRecord.id} />
    </div>
  );
}
