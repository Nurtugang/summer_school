import { MIN_TRIAD_FIELD_CHARS, MIN_TRIAD_FIELD_WORDS } from "@/lib/config";
import { containsBloomVerb } from "@/lib/bloomVerbs";
import type { ChallengeResponse, TriadFields } from "@/lib/gemini";

export function isFieldMeaningful(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < MIN_TRIAD_FIELD_CHARS) return false;
  const words = trimmed.split(/\s+/).filter(Boolean);
  return words.length >= MIN_TRIAD_FIELD_WORDS;
}

export function triadFieldsFilled(triad: TriadFields): boolean {
  return isFieldMeaningful(triad.outcome) && isFieldMeaningful(triad.assessment) && isFieldMeaningful(triad.activity);
}

export function outcomeHasBloomVerb(triad: TriadFields): boolean {
  return containsBloomVerb(triad.outcome);
}

function triadEquals(a: TriadFields, b: TriadFields): boolean {
  return a.outcome === b.outcome && a.assessment === b.assessment && a.activity === b.activity;
}

/** Изменил ли препод триаду после последней проверки, или ответил на каждый вопрос. */
export function changedOrRespondedSinceCheck(
  checkedSnapshot: TriadFields | null,
  currentTriad: TriadFields,
  responses: ChallengeResponse[]
): boolean {
  if (!checkedSnapshot) return false;
  const changed = !triadEquals(checkedSnapshot, currentTriad);
  const allAnswered = responses.length > 0 && responses.every((r) => r.answer.trim().length > 0);
  return changed || allAnswered;
}

export function canSubmitTriad(
  triad: TriadFields,
  checkedSnapshot: TriadFields | null,
  responses: ChallengeResponse[],
  challengesRan: boolean
): boolean {
  return (
    triadFieldsFilled(triad) &&
    challengesRan &&
    changedOrRespondedSinceCheck(checkedSnapshot, triad, responses)
  );
}
