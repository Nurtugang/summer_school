import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/isAdmin";
import { Eyebrow, Panel } from "@/components/ui";
import { AdminModuleToggle } from "@/components/AdminModuleToggle";

const TOGGLES = [
  { key: "hasTaskWizard" as const, label: "Комплект заданий (старая версия, М2)" },
  { key: "hasPentagramWizard" as const, label: "Pentagram-тренажёр (М2)" },
  { key: "hasDiagnostic" as const, label: "Диагностика резистентности" },
  { key: "hasCaseWizard" as const, label: "Сборка кейса (М3)" },
];

export default async function AdminPage() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) notFound();

  const days = await prisma.day.findMany({
    orderBy: { number: "asc" },
    include: { modules: { orderBy: { order: "asc" } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Eyebrow>Админка</Eyebrow>
        <h1 className="text-[32px] leading-tight font-heading font-bold text-ink">Видимость заданий</h1>
        <p className="mt-1 text-[14px] text-muted">
          Переключатели управляют тем, что видят преподаватели на странице модуля. Ничего не удаляется —
          уже сданные работы остаются доступны их авторам в любом случае.
        </p>
      </div>

      {days.map((day) => (
        <div key={day.id} className="flex flex-col gap-3">
          <p className="text-[13px] uppercase tracking-[.08em] text-muted">{day.number} августа</p>
          {day.modules.length === 0 ? (
            <p className="text-[14px] text-muted">Модулей нет.</p>
          ) : (
            day.modules.map((m) => (
              <Panel key={m.id} className="flex flex-col gap-3">
                <p className="text-[16px] font-medium text-ink">
                  Модуль {m.order} — {m.title}
                </p>
                <div className="flex flex-col gap-2">
                  {TOGGLES.map((t) => (
                    <AdminModuleToggle key={t.key} moduleId={m.id} field={t.key} label={t.label} checked={m[t.key]} />
                  ))}
                </div>
              </Panel>
            ))
          )}
        </div>
      ))}
    </div>
  );
}
