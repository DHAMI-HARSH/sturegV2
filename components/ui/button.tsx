import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

const styles: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "border border-[rgba(20,46,92,0.22)] bg-linear-to-r from-[#1a4c95] via-[#143a77] to-[#0d2654] text-white shadow-[0_20px_45px_-24px_rgba(7,29,66,0.45)] hover:-translate-y-0.5 hover:from-[#245ba8] hover:to-[#133567] disabled:border-[rgba(20,46,92,0.14)] disabled:from-[#95abd0] disabled:to-[#7f98c2] disabled:text-white/80 disabled:shadow-none",
  secondary:
    "border border-[rgba(20,46,92,0.16)] bg-[rgba(243,247,255,0.96)] text-[var(--accent-strong)] shadow-[0_14px_35px_-24px_rgba(7,29,66,0.2)] hover:-translate-y-0.5 hover:bg-[rgba(231,239,251,0.96)] disabled:border-[rgba(20,46,92,0.1)] disabled:bg-[rgba(236,242,250,0.9)] disabled:text-[#8da3c2]",
  ghost:
    "border border-transparent bg-transparent text-[var(--muted)] hover:bg-[rgba(20,46,92,0.08)] disabled:text-[#9aadc8]",
  danger:
    "border border-rose-300/45 bg-linear-to-r from-rose-600 to-rose-500 text-white hover:-translate-y-0.5 hover:from-rose-500 hover:to-rose-400 disabled:border-rose-200 disabled:from-rose-300 disabled:to-rose-300",
};

export function Button({
  className = "",
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
