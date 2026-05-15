import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 w-full rounded-xl border border-[rgba(20,46,92,0.16)] bg-[rgba(245,248,255,0.94)] px-3 text-sm text-[var(--foreground)] outline-none ring-0 placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:bg-white ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-28 w-full rounded-xl border border-[rgba(20,46,92,0.16)] bg-[rgba(245,248,255,0.94)] px-3 py-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:bg-white ${props.className ?? ""}`}
    />
  );
}
