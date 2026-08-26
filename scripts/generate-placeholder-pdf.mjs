import { Document, Page, Text, View, Font, renderToFile, StyleSheet } from "@react-pdf/renderer";
import { createElement } from "react";
import { mkdir } from "node:fs/promises";
import path from "node:path";

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
    padding: 64,
    fontFamily: "Manrope",
  },
  eyebrow: {
    fontSize: 11,
    color: "#0F5132",
    letterSpacing: 2,
    marginBottom: 16,
    fontWeight: "bold",
  },
  title: {
    fontSize: 28,
    color: "#14201B",
    marginBottom: 12,
    fontWeight: "bold",
  },
  line: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#D9D3C7",
    paddingTop: 16,
  },
  text: {
    fontSize: 12,
    color: "#5C6B62",
    lineHeight: 1.5,
  },
});

function PlaceholderDoc({ title }) {
  return createElement(
    Document,
    null,
    createElement(
      Page,
      { size: "A4", style: styles.page },
      createElement(Text, { style: styles.eyebrow }, "ПРЕЗЕНТАЦИЯ"),
      createElement(Text, { style: styles.title }, title),
      createElement(
        View,
        { style: styles.line },
        createElement(Text, { style: styles.text }, "Материалы модуля будут добавлены здесь.")
      )
    )
  );
}

async function main() {
  const outDir = path.join(process.cwd(), "public", "presentations");
  await mkdir(outDir, { recursive: true });

  const modules = [
    { file: "module-1.pdf", title: "Instructional Design с AI" },
    { file: "module-2.pdf", title: "Таксономия Блума и активное обучение" },
    { file: "module-3.pdf", title: "AI для подготовки занятия" },
  ];

  for (const m of modules) {
    await renderToFile(createElement(PlaceholderDoc, { title: m.title }), path.join(outDir, m.file));
    console.log("written", m.file);
  }
}

main();
