export interface SeedDiagnosticTask {
  order: number;
  level: string;
  taskText: string;
  isBroken: boolean;
  fixRubric?: string[];
}

export const MODULE2_DIAGNOSTIC_TASKS: SeedDiagnosticTask[] = [
  {
    order: 1,
    level: "Запоминание (Remember)",
    taskText: "Перечислите 5 этапов воронки продаж.",
    isBroken: false,
  },
  {
    order: 2,
    level: "Понимание (Understand)",
    taskText: "Своими словами объясните, чем отток клиентов отличается от снижения конверсии.",
    isBroken: false,
  },
  {
    order: 3,
    level: "Применение (Apply)",
    taskText: "Рассчитайте LTV клиента по данным таблицы, используя формулу.",
    isBroken: false,
  },
  {
    order: 4,
    level: "Анализ (Analyze)",
    taskText: "Проанализируйте отчёт по рекламной кампании и определите, почему упала конверсия.",
    isBroken: true,
    fixRubric: [
      "распознал, что задание в текущей форме решается вставкой отчёта в ИИ за один запрос (ventriloquising), а не реальным анализом",
      "предложил конкретный элемент резистентности: свои/локальные данные, аудит ошибок вывода ИИ или устная защита выводов",
    ],
  },
  {
    order: 5,
    level: "Оценка (Evaluate)",
    taskText:
      "Оцените, какая из двух маркетинговых стратегий эффективнее для нашей компании, и обоснуйте выбор.",
    isBroken: false,
  },
  {
    order: 6,
    level: "Создание (Create)",
    taskText: "Создайте текст рекламного поста с помощью ИИ.",
    isBroken: true,
    fixRubric: [
      "распознал, что «создать с помощью ИИ» само по себе не требует мышления студента и легко выполняется без него",
      "предложил конкретный элемент резистентности: ко-курирование с обоснованием выбора, критика черновика ИИ или защита итогового решения",
    ],
  },
];
