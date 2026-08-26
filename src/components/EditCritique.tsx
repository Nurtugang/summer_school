"use client";

import { useState } from "react";
import { Button, Panel } from "@/components/ui";
import type { CardCritique } from "@/lib/gemini";

export function EditCritique({
  cardId,
  canCheck,
  initialCritique,
}: {
  cardId: string;
  canCheck: boolean;
  initialCritique: CardCritique | null;
}) {
  const [critique, setCritique] = useState<CardCritique | null>(initialCritique);
  const [unavailable, setUnavailable] = useState(false);
  const [checking, setChecking] = useState(false);

  async function onCheck() {
    setChecking(true);
    setUnavailable(false);
    try {
      const res = await fetch(`/api/cards/${cardId}/critique`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setUnavailable(true);
        return;
      }
      if (data.unavailable) {
        setUnavailable(true);
        return;
      }
      setCritique(data.critique);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button variant="secondary" onClick={onCheck} disabled={!canCheck || checking}>
        {checking ? "Проверяем…" : "Проверь меня"}
      </Button>
      {!canCheck ? (
        <p className="text-[13px] text-muted">
          Доступно после того, как вы вручную измените хотя бы одну строку и заполните «Защиту решения».
        </p>
      ) : null}

      {unavailable ? (
        <Panel className="bg-mint">
          <p className="text-[14px] text-ink">ИИ сейчас не ответил. Можно отправлять карту и без этой проверки.</p>
        </Panel>
      ) : null}

      {critique && critique.notes.length > 0 ? (
        <Panel className="flex flex-col gap-2 border-l-4 border-l-terracotta">
          <p className="text-[12px] uppercase tracking-[.08em] text-terracotta">Отзыв ИИ о ваших правках</p>
          <ul className="flex flex-col gap-2">
            {critique.notes.map((note, i) => (
              <li key={i} className="text-[15px] text-ink">
                {note}
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}
