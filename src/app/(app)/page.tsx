import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Eyebrow } from "@/components/ui";

export default async function HomePage() {
  const days = await prisma.day.findMany({
    orderBy: { number: "asc" },
    include: { _count: { select: { modules: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Eyebrow>Расписание</Eyebrow>
        <h1 className="text-[32px] leading-tight font-heading font-bold text-ink">Выберите день</h1>
      </div>

      <div className="flex flex-col gap-3">
        {days.map((day) => (
          <Link
            key={day.id}
            href={`/days/${day.number}`}
            className="tap-target flex items-center justify-between border border-line bg-white/60 px-5 py-6 hover:border-forest"
          >
            <div>
              <p className="text-[22px] font-heading font-semibold text-ink">День {day.number}</p>
              <p className="mt-1 text-[15px] text-muted">
                {day._count.modules > 0
                  ? `Модулей: ${day._count.modules}`
                  : "Модули появятся позже"}
              </p>
            </div>
            <span className="text-forest text-[22px]">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
