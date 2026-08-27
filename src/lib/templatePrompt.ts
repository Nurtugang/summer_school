import type { WizardMaterial } from "@/lib/gemini";

export interface TemplateCardJson {
  promptText: string;
  files: WizardMaterial[];
  result: string | null;
  generated: boolean;
}

export function remainingPlaceholdersIn(text: string, placeholders: readonly string[]): string[] {
  return placeholders.filter((p) => text.includes(p));
}

export function canSubmitTemplatePrompt(card: TemplateCardJson, placeholders: readonly string[]): boolean {
  return remainingPlaceholdersIn(card.promptText, placeholders).length === 0 && card.generated;
}
