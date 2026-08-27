import type { TriadJson, TaskSetJson } from "@/lib/gemini";

export function titleForCard(kind: string, cardJson: unknown): string {
  if (kind === "task_set") {
    const t = cardJson as TaskSetJson;
    return t.pentagram?.context ? `Комплект заданий: ${t.pentagram.context}` : "Комплект заданий";
  }
  if (kind === "tutor_prompt") {
    return "Тьютор для домашней подготовки";
  }
  if (kind === "pentagram_prompt") {
    return "Pentagram-тренажёр";
  }
  const p = cardJson as TriadJson;
  return p.header?.topic || "План занятия";
}
