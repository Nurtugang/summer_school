import { PrismaClient, Prisma } from "@prisma/client";
import { MODULE1_QUESTIONS, type SeedQuestion } from "./questions.module1";
import { MODULE2_QUESTIONS } from "./questions.module2";
import { MODULE3_QUESTIONS } from "./questions.module3";
import { MODULE2_DIAGNOSTIC_TASKS } from "./diagnosticTasks.module2";

const prisma = new PrismaClient();

// Prisma's compound-unique shorthand doesn't accept `null` for a nullable column
// (moduleId_userId_order requires a non-null userId), so universal (userId = null)
// rows are looked up manually instead of via upsert's typed `where`.
async function seedQuestions(moduleId: string, questions: SeedQuestion[]) {
  for (const q of questions) {
    const points = q.type === "case_open" ? (q.rubric?.length ?? 1) : 1;
    const data = {
      type: q.type,
      prompt: q.prompt,
      options: (q.options as unknown as Prisma.InputJsonValue) ?? undefined,
      correctOptionId: q.correctOptionId,
      rubric: (q.rubric as unknown as Prisma.InputJsonValue) ?? undefined,
      points,
    };
    const existing = await prisma.question.findFirst({ where: { moduleId, userId: null, order: q.order } });
    if (existing) {
      await prisma.question.update({ where: { id: existing.id }, data });
    } else {
      await prisma.question.create({ data: { ...data, moduleId, order: q.order } });
    }
  }
}

async function main() {
  const day26 = await prisma.day.upsert({
    where: { number: 26 },
    update: {},
    create: { number: 26 },
  });

  const day27 = await prisma.day.upsert({
    where: { number: 27 },
    update: {},
    create: { number: 27 },
  });

  const day28 = await prisma.day.upsert({
    where: { number: 28 },
    update: {},
    create: { number: 28 },
  });

  const modules = [
    {
      order: 1,
      title: "Instructional Design с AI",
      pdfUrl: "/presentations/module-1.pdf",
      hasWizard: true,
      hasTaskWizard: false,
    },
    {
      order: 2,
      title: "Таксономия Блума и активное обучение",
      pdfUrl: "/presentations/module-2.pdf",
      hasWizard: false,
      hasTaskWizard: false, // старый «Комплект заданий» — временно скрыт, включается из /admin
      hasPentagramWizard: true, // новый Pentagram-тренажёр — на его месте
      hasDiagnostic: false, // диагностика резистентности — временно скрыта, включается из /admin
    },
    {
      order: 3,
      title: "AI для подготовки занятия",
      pdfUrl: "/presentations/module-3.pdf",
      hasWizard: false,
      hasTaskWizard: false,
      hasCaseWizard: true,
    },
  ];

  const savedModules: Record<number, { id: string }> = {};
  for (const m of modules) {
    const saved = await prisma.module.upsert({
      where: { dayId_order: { dayId: day27.id, order: m.order } },
      update: {
        title: m.title,
        pdfUrl: m.pdfUrl,
        hasWizard: m.hasWizard,
        hasTaskWizard: m.hasTaskWizard,
        hasPentagramWizard: m.hasPentagramWizard ?? false,
        hasDiagnostic: m.hasDiagnostic ?? true,
        hasCaseWizard: m.hasCaseWizard ?? false,
      },
      create: { ...m, dayId: day27.id },
    });
    savedModules[m.order] = saved;
  }

  const day26Modules = [
    { order: 1, title: "Ethics First", pdfUrl: "/presentations/day26-session-1.pdf" },
    { order: 2, title: "Responsible AI", pdfUrl: "/presentations/day26-session-2.pdf" },
    {
      order: 3,
      title: "Академиялық адалдық Generative AI дәуірінде",
      pdfUrl: "/presentations/day26-session-3.pdf",
    },
    {
      order: 4,
      title: "AI Policy: университеттің институционалдық қағидалары",
      pdfUrl: "/presentations/day26-session-4.pdf",
    },
  ];
  for (const m of day26Modules) {
    await prisma.module.upsert({
      where: { dayId_order: { dayId: day26.id, order: m.order } },
      update: { title: m.title, pdfUrl: m.pdfUrl },
      create: { ...m, dayId: day26.id },
    });
  }

  const day28Modules = [
    {
      order: 1,
      title: "Оценивание результатов обучения в эпоху Generative AI",
      pdfUrl: "/presentations/day28-module-1.pdf",
    },
    {
      order: 2,
      title: "Формирующее оценивание, обратная связь и рубрики с использованием AI",
      pdfUrl: "/presentations/day28-module-2.pdf",
    },
    {
      order: 3,
      title: "AI-инструменты для научных исследований и академического письма",
      pdfUrl: "/presentations/day28-module-3.pdf",
    },
  ];
  for (const m of day28Modules) {
    await prisma.module.upsert({
      where: { dayId_order: { dayId: day28.id, order: m.order } },
      update: { title: m.title, pdfUrl: m.pdfUrl, hasNotebookWizard: true },
      create: { ...m, dayId: day28.id, hasNotebookWizard: true },
    });
  }

  await seedQuestions(savedModules[1].id, MODULE1_QUESTIONS);
  await seedQuestions(savedModules[2].id, MODULE2_QUESTIONS);
  await seedQuestions(savedModules[3].id, MODULE3_QUESTIONS);

  const module2 = savedModules[2];
  for (const t of MODULE2_DIAGNOSTIC_TASKS) {
    const data = {
      level: t.level,
      taskText: t.taskText,
      isBroken: t.isBroken,
      fixRubric: (t.fixRubric as unknown as Prisma.InputJsonValue) ?? undefined,
    };
    const existing = await prisma.diagnosticTask.findFirst({
      where: { moduleId: module2.id, userId: null, order: t.order },
    });
    if (existing) {
      await prisma.diagnosticTask.update({ where: { id: existing.id }, data });
    } else {
      await prisma.diagnosticTask.create({ data: { ...data, moduleId: module2.id, order: t.order } });
    }
  }

  console.log("Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
