export function StepIndicator({
  current,
}: {
  current: "login" | "pending" | "form" | "done";
}) {
  const steps = ["login", "pending", "form", "done"] as const;
  const labels = {
    login: "Login",
    pending: "Pending",
    form: "Form",
    done: "Done",
  };

  return (
    <div className="grid grid-cols-4 gap-2">
      {steps.map((step) => {
        const active = steps.indexOf(step) <= steps.indexOf(current);
        return (
          <div
            key={step}
            className={`rounded-lg border px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.2em] ${
              active
                ? "border-[rgba(31,79,153,0.28)] bg-[rgba(31,79,153,0.12)] text-[var(--accent-strong)]"
                : "border-[rgba(20,46,92,0.12)] bg-[rgba(255,255,255,0.78)] text-[#8da3c2]"
            }`}
          >
            {labels[step]}
          </div>
        );
      })}
    </div>
  );
}
