"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorText, Field, Panel, Textarea } from "@/components/ui";
import {
  canSubmitTriad,
  changedOrRespondedSinceCheck,
  outcomeHasBloomVerb,
  triadFieldsFilled,
} from "@/lib/triad";
import type { CardCritique, Palette, TriadJson } from "@/lib/gemini";

export function TriadEditor({
  cardId,
  moduleId,
  initialCard,
  critique,
  status,
  reviewCount,
}: {
  cardId: string;
  moduleId: string;
  initialCard: TriadJson;
  critique: CardCritique | null;
  status: string;
  reviewCount: number;
}) {
  const router = useRouter();
  const readOnly = status !== "draft";

  const [triad, setTriad] = useState<TriadJson>(initialCard);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [palette, setPalette] = useState<Palette | null>(null);
  const [paletteLoading, setPaletteLoading] = useState(false);
  const [paletteError, setPaletteError] = useState<string | null>(null);

  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  const [reacting, setReacting] = useState(false);
  const [reactionUnavailable, setReactionUnavailable] = useState(false);
  const [localCritique, setLocalCritique] = useState<CardCritique | null>(critique);

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fieldsFilled = triadFieldsFilled(triad);
  const hasBloomVerb = outcomeHasBloomVerb(triad);
  const checkRan = triad.challenges.length > 0;
  const changedOrResponded = changedOrRespondedSinceCheck(triad.checkedSnapshot, triad, triad.responses);
  const canSubmit = canSubmitTriad(triad, triad.checkedSnapshot, triad.responses, checkRan);

  function updateField(key: "outcome" | "assessment" | "activity", value: string) {
    setTriad((t) => ({ ...t, [key]: value }));
    setSaved(false);
  }

  function insertIntoOutcome(text: string) {
    setTriad((t) => ({ ...t, outcome: t.outcome ? `${t.outcome}; ${text}` : text }));
    setSaved(false);
  }

  function insertIntoAssessment(text: string) {
    setTriad((t) => ({ ...t, assessment: t.assessment ? `${t.assessment}; ${text}` : text }));
    setSaved(false);
  }

  function updateResponse(index: number, answer: string) {
    setTriad((t) => ({
      ...t,
      responses: t.responses.map((r, i) => (i === index ? { ...r, answer } : r)),
    }));
    setSaved(false);
  }

  async function onSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(triad),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveError(data.error ?? "Не удалось сохранить");
        return;
      }
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function onOpenPalette() {
    setPaletteOpen((v) => !v);
    if (palette || paletteLoading) return;
    setPaletteLoading(true);
    setPaletteError(null);
    try {
      const res = await fetch(`/api/cards/${cardId}/palette`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setPaletteError(data.error ?? "Не удалось получить палитру");
        return;
      }
      setPalette(data.palette);
    } finally {
      setPaletteLoading(false);
    }
  }

  async function onCheck() {
    setChecking(true);
    setCheckError(null);
    try {
      const res = await fetch(`/api/cards/${cardId}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome: triad.outcome, assessment: triad.assessment, activity: triad.activity }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCheckError(data.error ?? "Не удалось получить проверку");
        return;
      }
      setTriad((t) => ({
        ...t,
        challenges: data.challenges,
        checkedSnapshot: data.checkedSnapshot,
        responses: data.responses,
      }));
      setLocalCritique(null);
      setReactionUnavailable(false);
    } finally {
      setChecking(false);
    }
  }

  async function onReact() {
    setReacting(true);
    setReactionUnavailable(false);
    try {
      const res = await fetch(`/api/cards/${cardId}/critique`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setCheckError(data.error ?? "Не удалось получить реакцию");
        return;
      }
      if (data.unavailable) {
        setReactionUnavailable(true);
        return;
      }
      setLocalCritique(data.critique);
    } finally {
      setReacting(false);
    }
  }

  async function onSubmit() {
    if (!confirm("Отправить занятие на анонимную рецензию? После отправки редактирование будет закрыто.")) {
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/cards/${cardId}/submit`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCheckError(data.error ?? "Не удалось отправить занятие");
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
        "Удалить эту работу и начать заново? Все правки и полученные рецензии будут потеряны без возможности восстановления."
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/cards/${cardId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCheckError(data.error ?? "Не удалось удалить работу");
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
          <p className="text-[15px] text-ink">Занятие отправлено на анонимную рецензию.</p>
          <p className="mt-1 text-[14px] text-muted">Получено рецензий: {reviewCount}</p>
        </Panel>
      ) : null}

      <Panel className="flex flex-col gap-1">
        <p className="text-[13px] uppercase tracking-[.08em] text-muted">Контекст</p>
        <p className="text-[15px] text-ink">
          {triad.header.topic} · {triad.header.level} · {triad.header.duration} мин
        </p>
      </Panel>

      <div className="flex flex-col gap-4">
        <Field label="Результат обучения" hint="1-2 через глагол по Блуму — что студент умеет после занятия">
          <Textarea
            disabled={readOnly}
            rows={2}
            value={triad.outcome}
            onChange={(e) => updateField("outcome", e.target.value)}
          />
        </Field>
        {!readOnly && triad.outcome.trim() && !hasBloomVerb ? (
          <p className="-mt-2 text-[13px] text-terracotta">
            Не нашли глагол действия по Блуму — проверьте формулировку (можно не исправлять, это подсказка).
          </p>
        ) : null}

        <Field label="Проверка" hint="Как ты убедишься, что студент умеет">
          <Textarea
            disabled={readOnly}
            rows={2}
            value={triad.assessment}
            onChange={(e) => updateField("assessment", e.target.value)}
          />
        </Field>

        <Field label="Активность" hint="Что студенты делают, чтобы дойти до результата">
          <Textarea
            disabled={readOnly}
            rows={2}
            value={triad.activity}
            onChange={(e) => updateField("activity", e.target.value)}
          />
        </Field>

        {!readOnly ? (
          <div className="flex flex-col gap-3">
            <Button variant="secondary" onClick={onOpenPalette} className="self-start">
              Палитра
            </Button>
            {paletteOpen ? (
              <Panel className="flex flex-col gap-3">
                {paletteLoading ? <p className="text-[14px] text-muted">Загружаем палитру…</p> : null}
                <ErrorText>{paletteError}</ErrorText>
                {palette ? (
                  <>
                    <div className="flex flex-col gap-2">
                      <p className="text-[12px] uppercase tracking-[.08em] text-muted">
                        Глаголы по Блуму — клик добавит в «Результат обучения»
                      </p>
                      {palette.verbGroups.map((group) => (
                        <div key={group.level} className="flex flex-wrap items-center gap-2">
                          <span className="text-[12px] text-muted">{group.level}:</span>
                          {group.verbs.map((verb) => (
                            <button
                              key={verb}
                              type="button"
                              onClick={() => insertIntoOutcome(verb)}
                              className="tap-target border border-line bg-white px-2.5 py-1 text-[13px] text-ink hover:border-forest"
                            >
                              {verb}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col gap-2">
                      <p className="text-[12px] uppercase tracking-[.08em] text-muted">
                        Формы проверки — клик добавит в «Проверку»
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {palette.assessmentForms.map((form) => (
                          <button
                            key={form}
                            type="button"
                            onClick={() => insertIntoAssessment(form)}
                            className="tap-target border border-line bg-white px-2.5 py-1 text-[13px] text-ink hover:border-forest"
                          >
                            {form}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}
              </Panel>
            ) : null}
          </div>
        ) : null}
      </div>

      {!readOnly ? (
        <Button onClick={onCheck} disabled={checking || !fieldsFilled}>
          {checking ? "Проверяем…" : "Проверка на согласованность"}
        </Button>
      ) : null}
      {!fieldsFilled && !readOnly ? (
        <p className="-mt-3 text-[13px] text-muted">Заполните все три поля содержательно, чтобы запустить проверку.</p>
      ) : null}

      {triad.challenges.length > 0 ? (
        <div className="flex flex-col gap-4">
          <p className="text-[13px] uppercase tracking-[.08em] text-muted">Вопросы-вызовы от ИИ</p>
          {triad.challenges.map((challenge, i) => (
            <Panel key={i} className="flex flex-col gap-2 border-l-4 border-l-terracotta">
              <p className="text-[15px] text-ink">{challenge.question}</p>
              <Field label="Ваш ответ (или поправьте триаду выше)">
                <Textarea
                  disabled={readOnly}
                  rows={2}
                  value={triad.responses[i]?.answer ?? ""}
                  onChange={(e) => updateResponse(i, e.target.value)}
                />
              </Field>
            </Panel>
          ))}
        </div>
      ) : null}

      {!readOnly && checkRan ? (
        <div className="flex flex-col gap-3">
          <Button variant="secondary" onClick={onReact} disabled={reacting || !changedOrResponded}>
            {reacting ? "Проверяем…" : "Проверь меня"}
          </Button>
          {!changedOrResponded ? (
            <p className="-mt-2 text-[13px] text-muted">
              Доступно после того, как вы измените поле или ответите на все вопросы.
            </p>
          ) : null}
          {reactionUnavailable ? (
            <Panel className="bg-mint">
              <p className="text-[14px] text-ink">ИИ сейчас не ответил. Можно отправлять и без этой проверки.</p>
            </Panel>
          ) : null}
        </div>
      ) : null}

      {localCritique && localCritique.notes.length > 0 ? (
        <Panel className="flex flex-col gap-2 border-l-4 border-l-terracotta">
          <p className="text-[12px] uppercase tracking-[.08em] text-terracotta">Реакция ИИ</p>
          <ul className="flex flex-col gap-2">
            {localCritique.notes.map((note, i) => (
              <li key={i} className="text-[15px] text-ink">
                {note}
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <ErrorText>{saveError || checkError}</ErrorText>

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
          {!fieldsFilled
            ? "Чтобы отправить: заполните все три поля триады."
            : !checkRan
              ? "Чтобы отправить: пройдите «Проверку на согласованность»."
              : "Чтобы отправить: измените поле или ответьте на все вопросы после проверки."}
        </p>
      ) : null}
    </div>
  );
}
