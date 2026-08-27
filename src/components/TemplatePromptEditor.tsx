"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorText, Panel, Textarea } from "@/components/ui";
import { MarkdownResult } from "@/components/MarkdownResult";
import { remainingPlaceholdersIn, canSubmitTemplatePrompt, type TemplateCardJson } from "@/lib/templatePrompt";
import { UPLOAD_MAX_FILES } from "@/lib/config";

export function TemplatePromptEditor({
  cardId,
  moduleId,
  status,
  initialCard,
  placeholders,
  placeholderHints,
  generateEndpoint,
  generateButtonLabel,
  generatingLabel,
  resultLabel,
  introTitle,
  introBody,
  downloadFileName,
}: {
  cardId: string;
  moduleId: string;
  status: string;
  initialCard: TemplateCardJson;
  placeholders: readonly string[];
  placeholderHints: Record<string, string>;
  generateEndpoint: string;
  generateButtonLabel: string;
  generatingLabel: string;
  resultLabel: string;
  introTitle: string;
  introBody: string[];
  downloadFileName: string;
}) {
  const router = useRouter();
  const readOnly = status !== "draft";

  const [card, setCard] = useState<TemplateCardJson>(initialCard);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const missing = remainingPlaceholdersIn(card.promptText, placeholders);
  const canSubmit = canSubmitTemplatePrompt(card, placeholders);

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

  async function onFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadError(null);

    const remaining = UPLOAD_MAX_FILES - card.files.length;
    const toUpload = Array.from(files).slice(0, Math.max(remaining, 0));
    if (toUpload.length === 0) {
      setUploadError(`Можно загрузить не более ${UPLOAD_MAX_FILES} файлов`);
      return;
    }

    setUploading(true);
    for (const file of toUpload) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setUploadError(data.error ?? "Не удалось загрузить файл");
          continue;
        }
        setCard((c) => ({ ...c, files: [...c.files, { fileName: data.fileName, text: data.text }] }));
      } catch {
        setUploadError("Не удалось загрузить файл");
      }
    }
    setUploading(false);
  }

  function removeFile(fileName: string) {
    setCard((c) => ({ ...c, files: c.files.filter((f) => f.fileName !== fileName) }));
  }

  async function onGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(generateEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptText: card.promptText, files: card.files }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Не удалось получить ответ от Gemini");
        return;
      }
      setCard((c) => ({ ...c, result: data.result, generated: true }));
      router.refresh();
    } catch {
      setError("Не удалось получить ответ от Gemini — попробуйте ещё раз.");
    } finally {
      setGenerating(false);
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
        "Удалить эту работу и начать заново? Промпт и результат будут потеряны без возможности восстановления."
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
    a.download = downloadFileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      {readOnly ? (
        <Panel className="bg-mint">
          <p className="text-[15px] text-ink">Задание завершено.</p>
        </Panel>
      ) : (
        <Panel className="flex flex-col gap-2 bg-mint">
          <p className="text-[15px] font-medium text-ink">{introTitle}</p>
          {introBody.map((p, i) => (
            <p key={i} className="text-[14px] text-ink">
              {p}
            </p>
          ))}
        </Panel>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-[13px] uppercase tracking-[.08em] text-muted">Промпт</p>
        {!readOnly && missing.length > 0 ? (
          <Panel className="flex flex-col gap-1.5 border-l-4 border-l-terracotta">
            <p className="text-[12px] uppercase tracking-[.06em] text-muted">Что вписать вместо плейсхолдеров</p>
            <ul className="flex flex-col gap-1">
              {missing.map((p) => (
                <li key={p} className="text-[14px] text-ink">
                  <span className="font-mono text-terracotta">{p}</span> — {placeholderHints[p]}
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
        <div className="flex flex-col gap-2">
          <p className="text-[13px] uppercase tracking-[.08em] text-muted">Файлы (необязательно)</p>
          <input
            type="file"
            accept=".pdf,.docx,.doc"
            multiple
            disabled={uploading || card.files.length >= UPLOAD_MAX_FILES}
            onChange={(e) => onFilesSelected(e.target.files)}
            className="tap-target w-full border border-line bg-white px-3.5 py-2.5 text-[15px]"
          />
          {uploading ? <p className="text-[14px] text-muted">Загружаем и распознаём файл…</p> : null}
          <ErrorText>{uploadError}</ErrorText>
          {card.files.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {card.files.map((f) => (
                <li
                  key={f.fileName}
                  className="flex items-center justify-between border border-line bg-white/60 px-3.5 py-2.5 text-[15px]"
                >
                  <span className="truncate">{f.fileName}</span>
                  <button type="button" onClick={() => removeFile(f.fileName)} className="tap-target px-2 text-terracotta">
                    Убрать
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : card.files.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] uppercase tracking-[.08em] text-muted">Приложенные файлы</p>
          <ul className="flex flex-col gap-1">
            {card.files.map((f) => (
              <li key={f.fileName} className="text-[14px] text-ink">
                {f.fileName}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!readOnly ? (
        <Button onClick={onGenerate} disabled={generating || missing.length > 0}>
          {generating ? generatingLabel : generateButtonLabel}
        </Button>
      ) : null}

      {card.result ? (
        <Panel className="flex flex-col gap-2 border-l-4 border-l-forest">
          <p className="text-[12px] uppercase tracking-[.08em] text-muted">{resultLabel}</p>
          <MarkdownResult text={card.result} />
        </Panel>
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
          {missing.length > 0
            ? "Чтобы завершить: замените все плейсхолдеры в промпте."
            : `Чтобы завершить: нажмите «${generateButtonLabel}» хотя бы один раз.`}
        </p>
      ) : null}
    </div>
  );
}
