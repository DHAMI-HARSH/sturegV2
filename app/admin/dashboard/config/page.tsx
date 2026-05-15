import { SemesterConfigPanel } from "@/components/admin/semester-config-panel";

export default function ConfigPage() {
  return (
    <section>
      <p className="text-sm uppercase tracking-[0.32em] text-[var(--muted)]">Semester Config</p>
      <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">Receipt Date Window</h1>
      <p className="mt-2 max-w-2xl text-[var(--muted)]">
        The OCR pipeline checks every uploaded receipt against this active semester window.
      </p>
      <div className="mt-6 max-w-5xl">
        <SemesterConfigPanel />
      </div>
    </section>
  );
}
