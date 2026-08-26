"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, ErrorText, Field, Input, Select } from "@/components/ui";
import { UNIVERSITY_NAME } from "@/lib/config";
import { SPECIALIZATIONS, SPECIALIZATION_OTHER } from "@/lib/specializations";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    department: "",
    email: "",
    password: "",
  });
  const [specialization, setSpecialization] = useState("");
  const [specializationOther, setSpecializationOther] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const finalSpecialization =
      specialization === SPECIALIZATION_OTHER ? specializationOther.trim() : specialization;
    if (!finalSpecialization) {
      setError("Укажите направление исследования");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, specialization: finalSpecialization }),
    });
    const data = await res.json();

    if (!res.ok) {
      setLoading(false);
      setError(data.error ?? "Не удалось зарегистрироваться");
      return;
    }

    const signInRes = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });
    setLoading(false);

    if (signInRes?.error) {
      setError("Регистрация прошла, но не удалось войти. Попробуйте войти вручную.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[32px] leading-tight font-heading font-bold text-ink">Регистрация</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Имя">
          <Input required value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
        </Field>
        <Field label="Фамилия">
          <Input required value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
        </Field>
        <Field label="Кафедра">
          <Input required value={form.department} onChange={(e) => set("department", e.target.value)} />
        </Field>
        <Field
          label="Направление исследования"
          hint="Используется, чтобы подбирать примеры заданий под вашу область"
        >
          <Select required value={specialization} onChange={(e) => setSpecialization(e.target.value)}>
            <option value="" disabled>
              Выберите направление…
            </option>
            {SPECIALIZATIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            <option value={SPECIALIZATION_OTHER}>Другое (указать вручную)</option>
          </Select>
        </Field>
        {specialization === SPECIALIZATION_OTHER ? (
          <Field label="Своё направление">
            <Input
              required
              value={specializationOther}
              onChange={(e) => setSpecializationOther(e.target.value)}
            />
          </Field>
        ) : null}
        <Field label="Университет">
          <Input value={UNIVERSITY_NAME} disabled className="bg-mint text-muted" />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </Field>
        <Field label="Пароль" hint="Не короче 8 символов">
          <Input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
          />
        </Field>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" disabled={loading}>
          {loading ? "Создаём аккаунт…" : "Зарегистрироваться"}
        </Button>
      </form>
      <p className="text-[15px] text-muted">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="text-forest hover:underline">
          Войти
        </Link>
      </p>
    </div>
  );
}
