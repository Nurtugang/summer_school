"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorText, Field, Panel, Textarea } from "@/components/ui";
import { changedOrRespondedToPrompt, canSubmitTaskSet, pentagramFieldsFilled, taskChanged } from "@/lib/taskSetFlow";
import type { TaskSetJson } from "@/lib/gemini";

const PENTAGRAM_FIELDS: { key: keyof TaskSetJson["pentagram"]; label: string; hint?: string }[] = [
  {
    key: "persona",
    label: "Роль ИИ (Persona)",
    hint: "Кем должен представиться ИИ, придумывая задания — например, «строгий методист по вашей дисциплине»",
  },
  {
    key: "context",
    label: "Контекст: дисциплина и студенты (Context)",
    hint: "Дисциплина, тема, курс и уровень студентов — рамка, под которую ИИ подберёт задания",
  },
  {
    key: "task",
    label: "Задача (Task)",
    hint: "Что именно должен придумать ИИ — какие 6 заданий по уровням Блума (Запоминание → Создание)",
  },
  {
    key: "output",
    label: "Формат ответа (Output)",
    hint: "В каком виде должен прийти каждый ответ — например, «текст задания в 2-3 предложения»",
  },
  {
    key: "constraint",
    label: "Ограничения (Constraint)",
    hint: "Что помешает студенту просто вставить задание в ИИ и получить готовый ответ?",
  },
];

export function TaskSetEditor({
  cardId,
  moduleId,
  initialCard,
  draftCard,
  status,
  reviewCount,
}: {
  cardId: string;
  moduleId: string;
  initialCard: TaskSetJson;
  draftCard: TaskSetJson;
  status: string;
  reviewCount: number;
}) {
  const router = useRouter();
  const readOnly = status !== "draft";

  const [taskSet, setTaskSet] = useState<TaskSetJson>(initialCard);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [checking, setChecking] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [recheckUnavailable, setRecheckUnavailable] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fieldsFilled = pentagramFieldsFilled(taskSet.pentagram);
  const promptCheckRan = taskSet.promptChallenges.length > 0;
  const readyToGenerate = changedOrRespondedToPrompt(
    taskSet.promptCheckedSnapshot,
    taskSet.pentagram,
    taskSet.promptResponses
  );
  const canSubmit = canSubmitTaskSet(taskSet, draftCard.rows);
  const flaggedCount = taskSet.flags.filter((f) => f.cheatable).length;

  function updatePentagram(key: keyof TaskSetJson["pentagram"], value: string) {
    setTaskSet((t) => ({ ...t, pentagram: { ...t.pentagram, [key]: value } }));
    setSaved(false);
  }

  function updatePromptResponse(index: number, answer: string) {
    setTaskSet((t) => ({
      ...t,
      promptResponses: t.promptResponses.map((r, i) => (i === index ? { ...r, answer } : r)),
    }));
    setSaved(false);
  }

  function updateTask(index: number, text: string) {
    setTaskSet((t) => ({ ...t, rows: t.rows.map((r, i) => (i === index ? { ...r, task: text } : r)) }));
    setSaved(false);
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskSet),
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

  async function onPromptCheck() {
    setChecking(true);
    setError(null);
    try {
      const res = await fetch(`/api/cards/${cardId}/prompt-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskSet.pentagram),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Не удалось проверить промпт");
        return;
      }
      setTaskSet((t) => ({
        ...t,
        promptChallenges: data.challenges,
        promptCheckedSnapshot: data.checkedSnapshot,
        promptResponses: data.responses,
      }));
    } catch {
      setError("Не удалось получить ответ от Gemini. Попробуйте ещё раз.");
    } finally {
      setChecking(false);
    }
  }

  async function onGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/cards/${cardId}/generate-tasks`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Не удалось сгенерировать задания");
        return;
      }
      setTaskSet((t) => ({ ...t, rows: data.rows, flags: data.flags, recheckFlags: null, generated: true }));
      router.refresh();
    } catch {
      setError("Не удалось получить ответ от Gemini — генерация заняла слишком много времени. Попробуйте ещё раз.");
    } finally {
      setGenerating(false);
    }
  }

  async function onRecheck() {
    setRechecking(true);
    setRecheckUnavailable(false);
    try {
      const res = await fetch(`/api/cards/${cardId}/recheck-tasks`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Не удалось перепроверить");
        return;
      }
      if (data.unavailable) {
        setRecheckUnavailable(true);
        return;
      }
      setTaskSet((t) => ({ ...t, recheckFlags: data.recheckFlags }));
    } catch {
      setRecheckUnavailable(true);
    } finally {
      setRechecking(false);
    }
  }

  async function onSubmit() {
    if (!confirm("Отправить комплект заданий на анонимную рецензию? После отправки редактирование будет закрыто.")) {
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/cards/${cardId}/submit`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Не удалось отправить комплект");
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
        "Удалить этот комплект заданий и начать заново? Все правки и полученные рецензии будут потеряны без возможности восстановления."
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/cards/${cardId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Не удалось удалить комплект");
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
          <p className="text-[15px] text-ink">Комплект отправлен на анонимную рецензию.</p>
          <p className="mt-1 text-[14px] text-muted">Получено рецензий: {reviewCount}</p>
        </Panel>
      ) : (
        <Panel className="flex flex-col gap-2 bg-mint">
          <p className="text-[15px] font-medium text-ink">Что это и зачем</p>
          <p className="text-[14px] text-ink">
            Pentagram — фреймворк системного промпта из пяти полей (Persona · Context · Task · Output
            · Constraint), под который ИИ соберёт комплект из 6 заданий по всем уровням Блума —
            от Запоминания до Создания. Ключевое поле — Constraint: без него задания уровней Анализ/
            Оценка/Создание чаще всего решаются студентом в один клик через тот же ИИ, а с
            продуманным Constraint — нет.
          </p>
          <p className="text-[14px] text-ink">
            После генерации ИИ честно прогоняет свои же 6 заданий через себя и сам помечает, какие из
            них он бы решил студенту за один запрос («списывается в ИИ»). Это не оценка вашей работы —
            это диагностика: ИИ показывает, где формулировка задания на практике слабее заявленного
            уровня. Помеченные задания нужно переписать так, чтобы Constraint реально сработал; если
            ИИ ничего не пометил — всё равно вручную усильте хотя бы одно задание высокого уровня
            (страховка на случай, если самопроверка ИИ ошиблась).
          </p>
          <p className="text-[14px] text-muted">
            Порядок: заполните Pentagram → «Проверка промпта» (ИИ задаст вопросы по формулировкам) →
            поправьте промпт или ответьте на вопросы → «Сгенерировать задания» → перепишите
            помеченные (или усильте вручную) → по желанию перепроверка → «Отправить на рецензию».
          </p>
        </Panel>
      )}

      <div className="flex flex-col gap-4">
        <p className="text-[13px] uppercase tracking-[.08em] text-muted">Pentagram-промпт</p>
        {PENTAGRAM_FIELDS.map((f) => (
          <Field key={f.key} label={f.label} hint={f.hint}>
            <Textarea
              disabled={readOnly || taskSet.generated}
              rows={2}
              value={taskSet.pentagram[f.key]}
              onChange={(e) => updatePentagram(f.key, e.target.value)}
            />
          </Field>
        ))}
      </div>

      {!readOnly && !promptCheckRan ? (
        <Button onClick={onPromptCheck} disabled={checking || !fieldsFilled}>
          {checking ? "Проверяем…" : "Проверка промпта"}
        </Button>
      ) : null}
      {!fieldsFilled && !readOnly ? (
        <p className="-mt-3 text-[13px] text-muted">Заполните все пять полей, включая Constraint.</p>
      ) : null}

      {taskSet.promptChallenges.length > 0 ? (
        <div className="flex flex-col gap-4">
          <p className="text-[13px] uppercase tracking-[.08em] text-muted">Вопросы-пробы от ИИ по промпту</p>
          {taskSet.promptChallenges.map((challenge, i) => (
            <Panel key={i} className="flex flex-col gap-2 border-l-4 border-l-terracotta">
              <p className="text-[12px] uppercase tracking-[.06em] text-muted">{challenge.field}</p>
              <p className="text-[15px] text-ink">{challenge.question}</p>
              {!taskSet.generated ? (
                <Field label="Ваш ответ (или поправьте промпт выше)">
                  <Textarea
                    disabled={readOnly}
                    rows={2}
                    value={taskSet.promptResponses[i]?.answer ?? ""}
                    onChange={(e) => updatePromptResponse(i, e.target.value)}
                  />
                </Field>
              ) : null}
            </Panel>
          ))}
        </div>
      ) : null}

      {!readOnly && promptCheckRan && !taskSet.generated ? (
        <div className="flex flex-col gap-2">
          <Button onClick={onGenerate} disabled={generating || !readyToGenerate}>
            {generating ? "Генерируем…" : "Сгенерировать задания"}
          </Button>
          {!readyToGenerate ? (
            <p className="text-[13px] text-muted">
              Доступно после того, как вы поправите промпт или ответите на все вопросы.
            </p>
          ) : null}
        </div>
      ) : null}

      {taskSet.generated ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] uppercase tracking-[.08em] text-muted">Задания по уровням Блума</p>
            <p className="text-[13px] text-muted">
              {flaggedCount > 0 ? `Списывается: ${flaggedCount} из 6` : "ИИ ничего не пометил"}
            </p>
          </div>
          {!readOnly ? (
            <p className="text-[13px] text-muted">
              Перепишите каждое задание с красным бейджем так, чтобы ИИ его больше не решил.
            </p>
          ) : null}
          {taskSet.rows.map((row, i) => {
            const flag = taskSet.flags[i];
            const changed = taskChanged(row.task, draftCard.rows[i]?.task ?? "");
            const recheck = taskSet.recheckFlags?.[i];
            return (
              <Panel
                key={i}
                className={`flex flex-col gap-2 border-l-4 ${flag?.cheatable ? "border-l-terracotta" : "border-l-forest"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12px] uppercase tracking-[.06em] text-muted">{row.level}</p>
                  {flag?.cheatable ? (
                    <span className="border border-terracotta px-2 py-0.5 text-[11px] uppercase tracking-[.06em] text-terracotta">
                      Списывается в ИИ
                    </span>
                  ) : null}
                </div>
                <Textarea disabled={readOnly} rows={3} value={row.task} onChange={(e) => updateTask(i, e.target.value)} />
                {flag?.cheatable ? (
                  <div className="border border-line bg-white/60 p-3">
                    <p className="text-[12px] uppercase tracking-[.08em] text-muted">Доказательство от ИИ</p>
                    <p className="mt-1 text-[14px] text-ink">{flag.proof}</p>
                    {!readOnly && !changed ? (
                      <p className="mt-1 text-[13px] text-terracotta">Пока не изменено — нужна правка перед отправкой.</p>
                    ) : null}
                  </div>
                ) : null}
                {recheck ? (
                  <p className={`text-[13px] ${recheck.cheatable ? "text-terracotta" : "text-forest"}`}>
                    Перепроверка: {recheck.cheatable ? "всё ещё списывается" : "больше не спишешь"}
                  </p>
                ) : null}
              </Panel>
            );
          })}
        </div>
      ) : null}

      {!readOnly && taskSet.generated ? (
        <div className="flex flex-col gap-3">
          <Button variant="secondary" onClick={onRecheck} disabled={rechecking}>
            {rechecking ? "Проверяем…" : "Проверь меня"}
          </Button>
          {recheckUnavailable ? (
            <Panel className="bg-mint">
              <p className="text-[14px] text-ink">ИИ сейчас не ответил. Можно отправлять и без этой проверки.</p>
            </Panel>
          ) : null}
        </div>
      ) : null}

      <ErrorText>{error}</ErrorText>

      <div className="flex flex-wrap items-center gap-3">
        <a href={`/api/cards/${cardId}/pdf`}>
          <Button variant="secondary">Скачать PDF</Button>
        </a>
        <a href={`/api/cards/${cardId}/docx`}>
          <Button variant="secondary">Скачать DOCX</Button>
        </a>
        {!readOnly ? (
          <>
            <Button onClick={onSave} disabled={saving}>
              {saving ? "Сохраняем…" : saved ? "Сохранено" : "Сохранить"}
            </Button>
            <Button onClick={onSubmit} disabled={submitting || !canSubmit}>
              {submitting ? "Отправляем…" : "Отправить на рецензию"}
            </Button>
          </>
        ) : null}
        <Button variant="danger" onClick={onDelete} disabled={deleting} className="ml-auto">
          {deleting ? "Удаляем…" : "Удалить и начать заново"}
        </Button>
      </div>
      {!readOnly && !canSubmit ? (
        <p className="text-[13px] text-muted">
          {!taskSet.generated
            ? "Чтобы отправить: сгенерируйте комплект заданий."
            : flaggedCount > 0
              ? "Чтобы отправить: перепишите все задания с бейджем «Списывается в ИИ»."
              : "Чтобы отправить: закалите вручную хотя бы одно задание уровня Анализ / Оценка / Создание."}
        </p>
      ) : null}
    </div>
  );
}
