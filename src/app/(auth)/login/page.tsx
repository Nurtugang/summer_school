"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, ErrorText, Field, Input } from "@/components/ui";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Неверный email или пароль");
      return;
    }
    router.push(searchParams.get("from") || "/");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[32px] leading-tight font-heading font-bold text-ink">Вход</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Email">
          <Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Пароль">
          <Input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" disabled={loading}>
          {loading ? "Входим…" : "Войти"}
        </Button>
      </form>
      <p className="text-[15px] text-muted">
        Нет аккаунта?{" "}
        <Link href="/register" className="text-forest hover:underline">
          Зарегистрироваться
        </Link>
      </p>
    </div>
  );
}
