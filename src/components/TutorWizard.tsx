"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorText } from "@/components/ui";

export function TutorWizard({ moduleId }: { moduleId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/tutor-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId }),
      });
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) {
        setError(data.error ?? "Не удалось создать задание");
        return;
      }
      router.replace(`/cards/${data.id}`);
    })();
    return () => {
      cancelled = true;
    };
  }, [moduleId, router]);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[15px] text-muted">Готовим шаблон промпта…</p>
      <ErrorText>{error}</ErrorText>
    </div>
  );
}
