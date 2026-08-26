import { Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle } from "docx";
import type { TriadJson, TaskSetJson } from "@/lib/gemini";

const FOREST = "0F5132";
const MUTED = "5C6B62";

function meta(label: string, value: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, bold: true, color: MUTED, size: 18 }),
      new TextRun({ text: value, size: 18 }),
    ],
    spacing: { after: 80 },
  });
}

function heading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240 },
    children: [new TextRun(text)],
  });
}

function reflectionBlock(card: TriadJson): Paragraph[] {
  if (card.challenges.length === 0) return [];
  return [
    heading("Проверка на согласованность"),
    ...card.challenges.flatMap((challenge, i) => [
      new Paragraph({
        spacing: { before: 160, after: 40 },
        border: { left: { style: BorderStyle.SINGLE, size: 24, color: FOREST, space: 8 } },
        children: [new TextRun({ text: `Вопрос ИИ: ${challenge.question}`, color: FOREST, bold: true, size: 18 })],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Ответ: ${card.responses[i]?.answer || "(поправлена триада)"}`, size: 18 }),
        ],
        spacing: { after: 100 },
      }),
    ]),
  ];
}

export async function renderCardDocx(card: TriadJson): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: card.header.topic || "Без названия" })],
          }),
          meta("Уровень", card.header.level),
          meta("Длительность", card.header.duration),
          heading("Результат обучения"),
          new Paragraph({ text: card.outcome }),
          heading("Проверка"),
          new Paragraph({ text: card.assessment }),
          heading("Активность"),
          new Paragraph({ text: card.activity }),
          ...reflectionBlock(card),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

function taskSetRowBlock(row: TaskSetJson["rows"][number]): Paragraph[] {
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 200, after: 60 },
      border: {
        left: { style: BorderStyle.SINGLE, size: 24, color: FOREST, space: 8 },
      },
      children: [new TextRun({ text: row.level, color: FOREST })],
    }),
    new Paragraph({ text: row.task, spacing: { after: 120 } }),
  ];
}

export async function renderTaskSetDocx(card: TaskSetJson): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: card.pentagram.context || "Комплект заданий" })],
          }),
          meta("Роль ИИ", card.pentagram.persona),
          meta("Задача", card.pentagram.task),
          meta("Формат ответа", card.pentagram.output),
          meta("Ограничения (табу)", card.pentagram.constraint || "—"),
          heading("Задания по уровням Блума"),
          ...card.rows.flatMap(taskSetRowBlock),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
