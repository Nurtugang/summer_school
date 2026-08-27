"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorText, Panel, Textarea } from "@/components/ui";
import { remainingBracketPlaceholders, canSubmitNotebookLog, type NotebookCardJson } from "@/lib/notebookLog";

export function NotebookLogEditor({
  cardId,
  moduleId,
  status,
  initialCard,
  introLines,
  examples,
}: {
  cardId: string;
  moduleId: string;
  status: string;
  initialCard: NotebookCardJson;
  introLines: string[];
  examples: string[];
}) {
  const router = useRouter();
  const readOnly = status !== "draft";

  const [card, setCard] = useState<NotebookCardJson>(initialCard);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canSubmit = canSubmitNotebookLog(card);

  function updatePromptText(index: number, value: string) {
    setCard((c) => ({
      ...c,
      prompts: c.prompts.map((p, i) => (i === index ? { ...p, promptText: value } : p)),
    }));
    setSaved(false);
  }

  function updateResult(index: number, value: string) {
    setCard((c) => ({
      ...c,
      prompts: c.prompts.map((p, i) => (i === index ? { ...p, result: value } : p)),
    }));
    setSaved(false);
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(card),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Не удалось сохранить");
        return;
      }
      setSaved(true);
    } catch {
      setError("Не удалось сохранить. Попробуйте ещё раз.");
    } finally {
      setSaving(false);
    }
  }

  async function onSubmit() {
    if (!confirm("Отметить задание как готовое? После этого редактирование будет закрыто.")) {
      return;
    }
    setSubmitting(true);
    try {
      const saveRes = await fetch(`/api/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(card),
      });
      if (!saveRes.ok) {
        const data = await saveRes.json().catch(() => ({}));
        setError(data.error ?? "Не удалось сохранить");
        return;
      }
      const res = await fetch(`/api/cards/${cardId}/submit`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Не удалось завершить задание");
        return;
      }
      router.refresh();
    } catch {
      setError("Не удалось завершить задание. Попробуйте ещё раз.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete() {
    if (
      !confirm(
        "Удалить эту работу и начать заново? Промпты и сохранённые результаты будут потеряны без возможности восстановления."
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/cards/${cardId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Не удалось удалить работу");
        return;
      }
      router.push(`/modules/${moduleId}`);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {readOnly ? (
        <Panel className="bg-mint">
          <p className="text-[15px] text-ink">Задание завершено.</p>
        </Panel>
      ) : (
        <Panel className="flex flex-col gap-2 bg-mint">
          <p className="text-[15px] font-medium text-ink">Как это делается</p>
          {introLines.map((line, i) => (
            <p key={i} className="text-[14px] text-ink">
              {line}
            </p>
          ))}
          <p className="text-[14px] text-muted">
            Рецензии не будет — просто сохраните то, что реально получили от NotebookLM, по каждому промпту.
          </p>
        </Panel>
      )}

      {card.prompts.map((prompt, i) => {
        const missing = remainingBracketPlaceholders(prompt.promptText);
        return (
          <div key={i} className="flex flex-col gap-3 border border-line bg-white/60 p-5">
            <p className="text-[16px] font-heading font-semibold text-ink">{prompt.label}</p>

            <div className="flex flex-col gap-2">
              <p className="text-[13px] uppercase tracking-[.08em] text-muted">Промпт</p>
              <Textarea
                disabled={readOnly}
                rows={10}
                value={prompt.promptText}
                onChange={(e) => updatePromptText(i, e.target.value)}
                className="font-mono text-[13px]"
              />
              {!readOnly ? (
                missing.length > 0 ? (
                  <p className="text-[13px] text-terracotta">Осталось заменить: {missing.join(", ")}</p>
                ) : (
                  <p className="text-[13px] text-forest">Все плейсхолдеры заменены.</p>
                )
              ) : null}
            </div>

            {examples[i] ? (
              <Panel className="flex flex-col gap-1.5 border-l-4 border-l-forest">
                <p className="text-[12px] uppercase tracking-[.06em] text-muted">Пример заполнения</p>
                <p className="whitespace-pre-wrap text-[13px] text-muted">{examples[i]}</p>
              </Panel>
            ) : null}

            <div className="flex flex-col gap-2">
              <p className="text-[13px] uppercase tracking-[.08em] text-muted">Что вы получили от NotebookLM?</p>
              <Textarea
                disabled={readOnly}
                rows={8}
                value={prompt.result}
                onChange={(e) => updateResult(i, e.target.value)}
                placeholder="Вставьте сюда ответ NotebookLM на этот промпт"
              />
            </div>
          </div>
        );
      })}

      <ErrorText>{error}</ErrorText>

      <div className="flex flex-wrap items-center gap-3">
        {!readOnly ? (
          <>
            <Button onClick={onSave} disabled={saving}>
              {saving ? "Сохраняем…" : saved ? "Сохранено" : "Сохранить"}
            </Button>
            <Button onClick={onSubmit} disabled={submitting || !canSubmit}>
              {submitting ? "Завершаем…" : "Готово"}
            </Button>
          </>
        ) : null}
        <Button variant="danger" onClick={onDelete} disabled={deleting} className="ml-auto">
          {deleting ? "Удаляем…" : "Удалить и начать заново"}
        </Button>
      </div>
      {!readOnly && !canSubmit ? (
        <p className="text-[13px] text-muted">
          Чтобы завершить: замените все плейсхолдеры и вставьте, что получили от NotebookLM, в каждый из промптов.
        </p>
      ) : null}
    </div>
  );
}
