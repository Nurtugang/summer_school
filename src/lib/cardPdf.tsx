import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { createElement as h } from "react";
import path from "node:path";
import type { TriadJson, TaskSetJson } from "@/lib/gemini";

const FONT_PATH = path.join(process.cwd(), "src/assets/fonts/Manrope-Variable.ttf");

Font.register({
  family: "Manrope",
  fonts: [
    { src: FONT_PATH, fontWeight: "normal" },
    { src: FONT_PATH, fontWeight: "bold" },
  ],
});

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#F5F2EC",
    padding: 40,
    fontFamily: "Manrope",
    color: "#14201B",
  },
  eyebrow: {
    fontSize: 9,
    color: "#0F5132",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  title: {
    fontSize: 20,
    fontFamily: "Manrope",
    fontWeight: "bold",
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 14,
  },
  metaItem: {
    fontSize: 9,
    color: "#5C6B62",
  },
  section: {
    marginBottom: 12,
    borderTopWidth: 1,
    borderTopColor: "#D9D3C7",
    paddingTop: 10,
  },
  sectionLabel: {
    fontSize: 9,
    color: "#5C6B62",
    marginBottom: 3,
  },
  sectionText: {
    fontSize: 11,
    lineHeight: 1.4,
  },
  rowBlock: {
    borderWidth: 1,
    borderColor: "#D9D3C7",
    borderLeftWidth: 4,
    borderLeftColor: "#0F5132",
    padding: 10,
    marginBottom: 8,
  },
  rowTitle: {
    fontSize: 12,
    fontFamily: "Manrope",
    fontWeight: "bold",
    marginBottom: 6,
  },
  field: {
    marginBottom: 5,
  },
  fieldLabel: {
    fontSize: 8,
    color: "#5C6B62",
    marginBottom: 1,
  },
  fieldValue: {
    fontSize: 10,
    lineHeight: 1.4,
  },
  aiTag: {
    fontSize: 8,
    color: "#B4472A",
    marginTop: 2,
  },
});

export function CardPdfDocument({ card }: { card: TriadJson }) {
  return h(
    Document,
    null,
    h(
      Page,
      { size: "A4", style: styles.page },
      h(Text, { style: styles.eyebrow }, "ЗАНЯТИЕ"),
      h(Text, { style: styles.title }, card.header.topic || "Без названия"),
      h(
        View,
        { style: styles.metaRow },
        h(Text, { style: styles.metaItem }, `Уровень: ${card.header.level}`),
        h(Text, { style: styles.metaItem }, `Длительность: ${card.header.duration}`)
      ),
      h(
        View,
        { style: styles.section },
        h(Text, { style: styles.sectionLabel }, "Результат обучения"),
        h(Text, { style: styles.sectionText }, card.outcome)
      ),
      h(
        View,
        { style: styles.section },
        h(Text, { style: styles.sectionLabel }, "Проверка"),
        h(Text, { style: styles.sectionText }, card.assessment)
      ),
      h(
        View,
        { style: styles.section },
        h(Text, { style: styles.sectionLabel }, "Активность"),
        h(Text, { style: styles.sectionText }, card.activity)
      ),
      ...(card.challenges.length > 0
        ? [
            h(Text, { key: "reflection-label", style: styles.sectionLabel }, "Проверка на согласованность"),
            ...card.challenges.map((challenge, i) =>
              h(
                View,
                { key: i, style: styles.rowBlock, wrap: false },
                h(Text, { style: styles.rowTitle }, `Вопрос ИИ: ${challenge.question}`),
                h(
                  Text,
                  { style: styles.fieldValue },
                  `Ответ: ${card.responses[i]?.answer || "(поправлена триада)"}`
                )
              )
            ),
          ]
        : [])
    )
  );
}

export function TaskSetPdfDocument({ card }: { card: TaskSetJson }) {
  return h(
    Document,
    null,
    h(
      Page,
      { size: "A4", style: styles.page },
      h(Text, { style: styles.eyebrow }, "КОМПЛЕКТ ЗАДАНИЙ"),
      h(Text, { style: styles.title }, card.pentagram.context || "Без названия"),
      h(
        View,
        { style: styles.section },
        h(Text, { style: styles.sectionLabel }, "Роль ИИ"),
        h(Text, { style: styles.sectionText }, card.pentagram.persona)
      ),
      h(
        View,
        { style: styles.section },
        h(Text, { style: styles.sectionLabel }, "Задача"),
        h(Text, { style: styles.sectionText }, card.pentagram.task)
      ),
      h(
        View,
        { style: styles.section },
        h(Text, { style: styles.sectionLabel }, "Ограничения"),
        h(Text, { style: styles.sectionText }, card.pentagram.constraint)
      ),
      ...card.rows.map((row, i) =>
        h(
          View,
          { key: i, style: styles.rowBlock, wrap: false },
          h(Text, { style: styles.rowTitle }, row.level),
          h(Text, { style: styles.fieldValue }, row.task)
        )
      )
    )
  );
}
