export interface NotebookPromptEntry {
  label: string;
  promptText: string;
  result: string;
}

export interface NotebookCardJson {
  prompts: NotebookPromptEntry[];
}

const MIN_RESULT_CHARS = 20;

export function canSubmitNotebookLog(card: NotebookCardJson): boolean {
  if (card.prompts.length === 0) return false;
  return card.prompts.every((p) => p.result.trim().length >= MIN_RESULT_CHARS);
}
