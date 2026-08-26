"use client";

import { useState } from "react";
import { Button, ErrorText, Field, Select, Textarea } from "@/components/ui";

function ScorePicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`tap-target flex-1 border text-[16px] ${
            value === n ? "border-forest bg-forest text-paper" : "border-line bg-white text-ink"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

interface KindConfig {
  criterion1Label: string;
  criterion1Hint?: string;
  criterion2Label: string;
  criterion2Hint?: string;
  weakestLinkLabel: string;
  weakestLinkOptions: { value: string; label: string }[];
}

const CONFIG_BY_KIND: Record<string, KindConfig> = {
  alignment_card: {
    criterion1Label: "Сцепка результат → проверка → активность",
    criterion2Label: "Устойчивость к списыванию в ИИ",
    weakestLinkLabel: "Самое слабое звено",
    weakestLinkOptions: [
      { value: "outcome", label: "Результат" },
      { value: "assessment", label: "Проверка" },
      { value: "activity", label: "Активность" },
      { value: "all_good", label: "Всё сцеплено" },
    ],
  },
  task_set: {
    criterion1Label: "Разноуровневость",
    criterion1Hint: "Реально покрыты разные уровни Блума, а не всё «запоминание» под чужими ярлыками?",
    criterion2Label: "Устойчивость к списыванию",
    criterion2Hint: "Высокие уровни нельзя решить в один клик у ИИ?",
    weakestLinkLabel: "Какой уровень провис",
    weakestLinkOptions: [
      { value: "remember", label: "Запоминание" },
      { value: "understand", label: "Понимание" },
      { value: "apply", label: "Применение" },
      { value: "analyze", label: "Анализ" },
      { value: "evaluate", label: "Оценка" },
      { value: "create", label: "Создание" },
    ],
  },
};

export function ReviewForm({
  cardId,
  kind,
  onSubmitted,
}: {
  cardId: string;
  kind: string;
  onSubmitted?: () => void;
}) {
  const config = CONFIG_BY_KIND[kind] ?? CONFIG_BY_KIND.alignment_card;

  const [alignmentScore, setAlignmentScore] = useState(0);
  const [resilienceScore, setResilienceScore] = useState(0);
  const [alignmentNote, setAlignmentNote] = useState("");
  const [resilienceNote, setResilienceNote] = useState("");
  const [weakestLink, setWeakestLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!alignmentScore || !resilienceScore) {
      setError("Поставьте оценку по обоим критериям");
      return;
    }
    if (!weakestLink) {
      setError(`Отметьте: ${config.weakestLinkLabel.toLowerCase()}`);
      return;
    }
    if (alignmentScore <= 2 && !alignmentNote.trim()) {
      setError(`Низкая оценка по критерию «${config.criterion1Label}» — коротко укажите, в чём разрыв`);
      return;
    }
    if (resilienceScore <= 2 && !resilienceNote.trim()) {
      setError(`Низкая оценка по критерию «${config.criterion2Label}» — коротко укажите, в чём разрыв`);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/reviews/${cardId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alignmentScore, resilienceScore, alignmentNote, resilienceNote, weakestLink }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Не удалось отправить рецензию");
        return;
      }
      onSubmitted?.();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5 border border-line bg-white/60 p-5">
      <div className="flex flex-col gap-2">
        <p className="text-[15px] font-semibold text-ink">{config.criterion1Label}</p>
        {config.criterion1Hint ? <p className="text-[13px] text-muted">{config.criterion1Hint}</p> : null}
        <ScorePicker value={alignmentScore} onChange={setAlignmentScore} />
        {alignmentScore > 0 && alignmentScore <= 2 ? (
          <Field label="В чём разрыв">
            <Textarea rows={2} value={alignmentNote} onChange={(e) => setAlignmentNote(e.target.value)} />
          </Field>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[15px] font-semibold text-ink">{config.criterion2Label}</p>
        {config.criterion2Hint ? <p className="text-[13px] text-muted">{config.criterion2Hint}</p> : null}
        <ScorePicker value={resilienceScore} onChange={setResilienceScore} />
        {resilienceScore > 0 && resilienceScore <= 2 ? (
          <Field label="В чём разрыв">
            <Textarea rows={2} value={resilienceNote} onChange={(e) => setResilienceNote(e.target.value)} />
          </Field>
        ) : null}
      </div>

      <Field label={config.weakestLinkLabel}>
        <Select value={weakestLink} onChange={(e) => setWeakestLink(e.target.value)}>
          <option value="" disabled>
            Выберите…
          </option>
          {config.weakestLinkOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </Field>

      <ErrorText>{error}</ErrorText>

      <Button type="submit" disabled={submitting}>
        {submitting ? "Отправляем…" : "Отправить рецензию"}
      </Button>
    </form>
  );
}
