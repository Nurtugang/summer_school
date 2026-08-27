export interface NotebookPromptEntry {
  label: string;
  promptText: string;
  result: string;
}

export interface NotebookCardJson {
  prompts: NotebookPromptEntry[];
}

const MIN_RESULT_CHARS = 20;

/** Незаполненные плейсхолдеры вида [...] в тексте промпта. */
export function remainingBracketPlaceholders(text: string): string[] {
  return text.match(/\[[^\]]+\]/g) ?? [];
}

export function canSubmitNotebookLog(card: NotebookCardJson): boolean {
  if (card.prompts.length === 0) return false;
  return card.prompts.every(
    (p) => remainingBracketPlaceholders(p.promptText).length === 0 && p.result.trim().length >= MIN_RESULT_CHARS
  );
}
