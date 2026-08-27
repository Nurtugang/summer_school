"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TOGGLE_FIELDS = ["hasTaskWizard", "hasPentagramWizard", "hasDiagnostic", "hasTutorWizard"] as const;
export type ToggleField = (typeof TOGGLE_FIELDS)[number];

export function AdminModuleToggle({
  moduleId,
  field,
  label,
  checked,
}: {
  moduleId: string;
  field: ToggleField;
  label: string;
  checked: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(checked);
  const [pending, setPending] = useState(false);

  async function onToggle() {
    const next = !value;
    setValue(next);
    setPending(true);
    try {
      const res = await fetch(`/api/admin/modules/${moduleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, value: next }),
      });
      if (!res.ok) {
        setValue(!next);
        return;
      }
      router.refresh();
    } catch {
      setValue(!next);
    } finally {
      setPending(false);
    }
  }

  return (
    <label className="tap-target flex items-center gap-3 text-[15px] text-ink">
      <input type="checkbox" checked={value} disabled={pending} onChange={onToggle} className="h-5 w-5 accent-forest" />
      {label}
    </label>
  );
}
