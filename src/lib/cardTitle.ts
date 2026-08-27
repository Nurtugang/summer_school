import type { TriadJson, TaskSetJson } from "@/lib/gemini";

export function titleForCard(kind: string, cardJson: unknown): string {
  if (kind === "task_set") {
    const t = cardJson as TaskSetJson;
    return t.pentagram?.context ? `Комплект заданий: ${t.pentagram.context}` : "Комплект заданий";
  }
  if (kind === "case_prompt") {
    return "Сборка кейса";
  }
  if (kind === "pentagram_prompt") {
    return "Pentagram-тренажёр";
  }
  if (kind === "notebook_log") {
    return "Работа с NotebookLM";
  }
  const p = cardJson as TriadJson;
  return p.header?.topic || "План занятия";
}
