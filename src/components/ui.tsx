import { ButtonHTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const base = "tap-target inline-flex items-center justify-center px-5 py-2.5 text-[16px] font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-forest text-paper border-forest hover:bg-[#0c3f28]",
    secondary: "bg-transparent text-ink border-ink hover:bg-ink hover:text-paper",
    danger: "bg-transparent text-terracotta border-terracotta hover:bg-terracotta hover:text-paper",
  };
  return <button className={cx(base, variants[variant], className)} {...props} />;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        "tap-target w-full border border-line bg-white px-3.5 py-2.5 text-[16px] text-ink outline-none focus:border-forest",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cx(
        "w-full border border-line bg-white px-3.5 py-2.5 text-[16px] text-ink outline-none focus:border-forest resize-y",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cx(
        "tap-target w-full border border-line bg-white px-3.5 py-2.5 text-[16px] text-ink outline-none focus:border-forest",
        className
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cx("block text-[13px] uppercase tracking-[.08em] text-muted mb-1.5", className)}
      {...props}
    />
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {hint ? <p className="mt-1.5 text-[14px] text-muted">{hint}</p> : null}
    </div>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("border border-line bg-white/60 p-5", className)}>{children}</div>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[13px] uppercase tracking-[.14em] text-forest font-semibold font-heading">
      {children}
    </p>
  );
}

export function ErrorText({ children }: { children?: string | null }) {
  if (!children) return null;
  return <p className="text-[14px] text-terracotta">{children}</p>;
}
