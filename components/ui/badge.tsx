export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const tones = {
    neutral: "border border-[rgba(20,46,92,0.16)] bg-[rgba(20,46,92,0.08)] text-[var(--accent-strong)]",
    success: "border border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border border-amber-200 bg-amber-50 text-[var(--warning-foreground)]",
    danger: "border border-rose-200 bg-rose-50 text-rose-700",
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
