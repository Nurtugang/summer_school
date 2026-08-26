"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorText, Field, Input, Select, Textarea } from "@/components/ui";

interface Material {
  fileName: string;
  text: string;
}

export function Wizard({ moduleId }: { moduleId: string }) {
  const router = useRouter();

  const [course, setCourse] = useState({
    title: "",
    level: "Бакалавриат",
    modality: "Очно",
    sessionLength: "",
    priorPrep: "",
  });

  const [materials, setMaterials] = useState<Material[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function onFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadError(null);

    const remaining = 3 - materials.length;
    const toUpload = Array.from(files).slice(0, Math.max(remaining, 0));
    if (toUpload.length === 0) {
      setUploadError("Можно загрузить не более 3 файлов");
      return;
    }

    setUploading(true);
    for (const file of toUpload) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) {
          setUploadError(data.error ?? "Не удалось загрузить файл");
          continue;
        }
        setMaterials((prev) => [...prev, { fileName: data.fileName, text: data.text }]);
      } catch {
        setUploadError("Не удалось загрузить файл");
      }
    }
    setUploading(false);
  }

  function removeMaterial(fileName: string) {
    setMaterials((prev) => prev.filter((m) => m.fileName !== fileName));
  }

  const valid = course.title.trim() && course.sessionLength.trim();

  async function onSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId, course, materials }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? "Не удалось создать занятие");
        setSubmitting(false);
        return;
      }
      router.push(`/cards/${data.id}`);
    } catch {
      setSubmitError("Не удалось создать занятие. Попробуйте ещё раз.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Field label="Тема занятия">
          <Input value={course.title} onChange={(e) => setCourse({ ...course, title: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Уровень">
            <Select value={course.level} onChange={(e) => setCourse({ ...course, level: e.target.value })}>
              <option>Бакалавриат</option>
              <option>Магистратура</option>
            </Select>
          </Field>
          <Field label="Формат">
            <Select value={course.modality} onChange={(e) => setCourse({ ...course, modality: e.target.value })}>
              <option>Очно</option>
              <option>Онлайн</option>
              <option>Смешанно</option>
            </Select>
          </Field>
        </div>
        <Field label="Длительность занятия, мин">
          <Input
            type="number"
            min={0}
            value={course.sessionLength}
            onChange={(e) => setCourse({ ...course, sessionLength: e.target.value })}
          />
        </Field>
        <Field label="Что студенты уже прошли до этого занятия">
          <Textarea
            rows={3}
            value={course.priorPrep}
            onChange={(e) => setCourse({ ...course, priorPrep: e.target.value })}
          />
        </Field>

        <Field label="Материалы (необязательно)" hint="PDF с текстовым слоем или DOCX, до 3 файлов, не более 10 МБ каждый">
          <input
            type="file"
            accept=".pdf,.docx,.doc"
            multiple
            disabled={uploading || materials.length >= 3}
            onChange={(e) => onFilesSelected(e.target.files)}
            className="tap-target w-full border border-line bg-white px-3.5 py-2.5 text-[15px]"
          />
        </Field>
        {uploading ? <p className="text-[14px] text-muted">Загружаем и распознаём файл…</p> : null}
        <ErrorText>{uploadError}</ErrorText>
        {materials.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {materials.map((m) => (
              <li
                key={m.fileName}
                className="flex items-center justify-between border border-line bg-white/60 px-3.5 py-2.5 text-[15px]"
              >
                <span className="truncate">{m.fileName}</span>
                <button type="button" onClick={() => removeMaterial(m.fileName)} className="tap-target px-2 text-terracotta">
                  Убрать
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <ErrorText>{submitError}</ErrorText>

      <Button onClick={onSubmit} disabled={submitting || !valid}>
        {submitting ? "Создаём…" : "Продолжить"}
      </Button>
    </div>
  );
}
