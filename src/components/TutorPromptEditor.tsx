"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorText, Panel, Textarea } from "@/components/ui";
import {
  remainingPlaceholders,
  canSubmitTutorPrompt,
  TUTOR_PLACEHOLDER_HINTS,
  type TutorCardJson,
} from "@/lib/tutorPrompt";

export function TutorPromptEditor({
  cardId,
  moduleId,
  initialCard,
  status,
}: {
  cardId: string;
  moduleId: string;
  initialCard: TutorCardJson;
  status: string;
}) {
  const router = useRouter();
  const readOnly = status !== "draft";

  const [card, setCard] = useState<TutorCardJson>(initialCard);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const missing = remainingPlaceholders(card.promptText);
  const canSubmit = canSubmitTutorPrompt(card);

  function updatePromptText(value: string) {
    setCard((c) => ({ ...c, promptText: value }));
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
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Не удалось сохранить");
        return;
      }
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function onSend() {
    if (!message.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/cards/${cardId}/tutor-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Не удалось получить ответ от тьютора");
        return;
      }
      setCard((c) => ({ ...c, transcript: data.transcript }));
      setMessage("");
    } finally {
      setSending(false);
    }
  }

  async function onSubmit() {
    if (!confirm("Отметить задание как готовое? После этого редактирование будет закрыто.")) {
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/cards/${cardId}/submit`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Не удалось завершить задание");
        return;
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete() {
    if (
      !confirm(
        "Удалить эту работу и начать заново? Промпт и история чата с тьютором будут потеряны без возможности восстановления."
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

  async function onCopy() {
    await navigator.clipboard.writeText(card.promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function onDownload() {
    const blob = new Blob([card.promptText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tutor-prompt.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      {readOnly ? (
        <Panel className="bg-mint">
          <p className="text-[15px] text-ink">Задание завершено. Промпт готов к передаче студентам.</p>
        </Panel>
      ) : (
        <Panel className="flex flex-col gap-2 bg-mint">
          <p className="text-[15px] font-medium text-ink">Что это и зачем</p>
          <p className="text-[14px] text-ink">
            Это готовый промпт-тьютор для домашней подготовки студентов к перевёрнутому занятию
            (flipped classroom) — на основе AI-Tutor из Mollick & Mollick. Идея в сократовском методе:
            тьютор НЕ даёт студенту готовых ответов, а ведёт наводящими вопросами, пока студент не
            поймёт сам. В конце диалога он выдаёт «входной билет» — короткую сводку того, что студент
            понял и с чем ещё не разобрался, — с этим студент и приходит в класс.
          </p>
          <p className="text-[14px] text-ink">
            Ниже — рабочий шаблон промпта с плейсхолдерами в квадратных скобках (`[ТЕМА]`,
            `[ПОНЯТИЕ 1]` и т.д.). Замените их на свои — под конкретное занятие, тему и уровень
            студентов. Больше ничего в тексте менять не обязательно, но можно, если хотите
            скорректировать поведение тьютора.
          </p>
          <p className="text-[14px] text-muted">
            Порядок: замените все плейсхолдеры → «Проверить» — откроется чат, где Gemini играет
            тьютора по вашему промпту, а вы пишете 2-3 реплики за студента (это единственный способ
            убедиться, что тьютор действительно не поддаётся и не выдаёт готовый ответ, даже если
            «студент» просит прямо) → «Готово» → скопируйте или скачайте промпт и отдайте студентам.
          </p>
        </Panel>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-[13px] uppercase tracking-[.08em] text-muted">Промпт тьютора</p>
        {!readOnly && missing.length > 0 ? (
          <Panel className="flex flex-col gap-1.5 border-l-4 border-l-terracotta">
            <p className="text-[12px] uppercase tracking-[.06em] text-muted">Что вписать вместо плейсхолдеров</p>
            <ul className="flex flex-col gap-1">
              {missing.map((p) => (
                <li key={p} className="text-[14px] text-ink">
                  <span className="font-mono text-terracotta">{p}</span> — {TUTOR_PLACEHOLDER_HINTS[p]}
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}
        <Textarea
          disabled={readOnly}
          rows={16}
          value={card.promptText}
          onChange={(e) => updatePromptText(e.target.value)}
          className="font-mono text-[14px]"
        />
        {!readOnly && missing.length === 0 ? (
          <p className="text-[13px] text-forest">Все плейсхолдеры заменены.</p>
        ) : null}
      </div>

      {!readOnly ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Сохраняем…" : saved ? "Сохранено" : "Сохранить"}
          </Button>
          <Button variant="secondary" onClick={() => setChatOpen((v) => !v)}>
            {chatOpen ? "Скрыть проверку" : "Проверить"}
          </Button>
        </div>
      ) : null}

      {chatOpen || (readOnly && card.transcript.length > 0) ? (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] uppercase tracking-[.08em] text-muted">
            Чат с тьютором (вы пишете за студента)
          </p>
          <div className="flex flex-col gap-3 border border-line bg-white/60 p-4">
            {card.transcript.length === 0 ? (
              <p className="text-[14px] text-muted">Пока пусто — напишите первую реплику за студента.</p>
            ) : (
              card.transcript.map((t, i) => (
                <div
                  key={i}
                  className={`flex flex-col gap-1 ${t.role === "user" ? "items-end text-right" : "items-start text-left"}`}
                >
                  <span className="text-[11px] uppercase tracking-[.06em] text-muted">
                    {t.role === "user" ? "Вы (за студента)" : "Тьютор"}
                  </span>
                  <p
                    className={`max-w-[80%] border px-3 py-2 text-[14px] text-ink ${
                      t.role === "user" ? "border-forest bg-mint" : "border-line bg-white"
                    }`}
                  >
                    {t.text}
                  </p>
                </div>
              ))
            )}
          </div>
          {!readOnly ? (
            <div className="flex items-center gap-3">
              <Textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ваша реплика за студента…"
              />
              <Button onClick={onSend} disabled={sending || !message.trim()}>
                {sending ? "Отправляем…" : "Отправить"}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <ErrorText>{error}</ErrorText>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={onCopy}>
          {copied ? "Скопировано" : "Копировать промпт"}
        </Button>
        <Button variant="secondary" onClick={onDownload}>
          Скачать промпт
        </Button>
        {!readOnly ? (
          <Button onClick={onSubmit} disabled={submitting || !canSubmit}>
            {submitting ? "Завершаем…" : "Готово"}
          </Button>
        ) : null}
        <Button variant="danger" onClick={onDelete} disabled={deleting} className="ml-auto">
          {deleting ? "Удаляем…" : "Удалить и начать заново"}
        </Button>
      </div>
      {!readOnly && !canSubmit ? (
        <p className="text-[13px] text-muted">
          {missing.length > 0
            ? "Чтобы завершить: замените все плейсхолдеры в промпте."
            : "Чтобы завершить: хотя бы раз проверьте тьютора в чате."}
        </p>
      ) : null}
    </div>
  );
}
