import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Eyebrow } from "@/components/ui";

export default async function DayPage({ params }: { params: Promise<{ day: string }> }) {
  const { day: dayParam } = await params;
  const dayNumber = Number(dayParam);
  if (!Number.isInteger(dayNumber)) notFound();

  const day = await prisma.day.findUnique({
    where: { number: dayNumber },
    include: { modules: { orderBy: { order: "asc" } } },
  });
  if (!day) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: `День ${day.number}` }]} />

      <div>
        <Eyebrow>День {day.number}</Eyebrow>
        <h1 className="text-[32px] leading-tight font-heading font-bold text-ink">Модули</h1>
      </div>

      {day.modules.length === 0 ? (
        <p className="border border-line bg-white/60 px-5 py-6 text-[15px] text-muted">
          Модули этого дня появятся позже.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {day.modules.map((module) => (
            <Link
              key={module.id}
              href={`/modules/${module.id}`}
              className="tap-target flex items-center justify-between border border-line bg-white/60 px-5 py-6 hover:border-forest"
            >
              <div>
                <p className="text-[13px] uppercase tracking-[.08em] text-muted">Модуль {module.order}</p>
                <p className="mt-1 text-[19px] font-heading font-semibold text-ink">{module.title}</p>
              </div>
              <span className="text-forest text-[22px]">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
