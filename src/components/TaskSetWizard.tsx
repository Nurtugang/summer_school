"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorText, Field, Textarea } from "@/components/ui";

export function TaskSetWizard({ moduleId }: { moduleId: string }) {
  const router = useRouter();
  const [persona, setPersona] = useState("");
  const [context, setContext] = useState("");
  const [task, setTask] = useState("");
  const [output, setOutput] = useState("");
  const [constraint, setConstraint] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = persona.trim() && context.trim() && task.trim() && output.trim() && constraint.trim();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const createRes = await fetch("/api/task-sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId, persona, context, task, output, constraint }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        setError(createData.error ?? "Не удалось создать комплект заданий");
        setSubmitting(false);
        return;
      }

      const checkRes = await fetch(`/api/cards/${createData.id}/prompt-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona, context, task, output, constraint }),
      });
      if (!checkRes.ok) {
        // Даже если проверка промпта не удалась, комплект уже создан — препод может
        // повторить проверку прямо на странице комплекта.
        router.push(`/cards/${createData.id}`);
        return;
      }

      router.push(`/cards/${createData.id}`);
    } catch {
      setError("Не удалось собрать комплект. Попробуйте ещё раз.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="Роль ИИ (Persona)" hint="Кем должна выступать модель, отвечая на промпт?">
        <Textarea rows={2} value={persona} onChange={(e) => setPersona(e.target.value)} />
      </Field>
      <Field label="Контекст: дисциплина и студенты (Context)">
        <Textarea rows={2} value={context} onChange={(e) => setContext(e.target.value)} />
      </Field>
      <Field label="Задача (Task)">
        <Textarea rows={2} value={task} onChange={(e) => setTask(e.target.value)} />
      </Field>
      <Field label="Формат ответа (Output)">
        <Textarea rows={2} value={output} onChange={(e) => setOutput(e.target.value)} />
      </Field>
      <Field
        label="Ограничения (Constraint)"
        hint="Что помешает студенту просто вставить задание в ИИ и получить готовый ответ? (опора на материал вашего занятия, фото своей работы, локальный контекст, устная защита…)"
      >
        <Textarea rows={3} value={constraint} onChange={(e) => setConstraint(e.target.value)} />
      </Field>

      <ErrorText>{error}</ErrorText>

      <Button type="submit" disabled={!valid || submitting}>
        {submitting ? "Собираем комплект…" : "Собрать комплект заданий"}
      </Button>
    </form>
  );
}
