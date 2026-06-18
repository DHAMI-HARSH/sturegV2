import Link from "next/link";
import { AdminLoginForm } from "@/components/admin-login-form";

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen px-4 py-16">
      <div className="mx-auto mb-5 max-w-5xl">
        <Link
          href="/"
          className="inline-flex items-center rounded-full border border-[rgba(20,46,92,0.14)] bg-[rgba(251,253,255,0.9)] px-4 py-2 text-sm font-semibold text-[var(--accent-strong)] shadow-[0_14px_35px_-24px_rgba(7,29,66,0.18)] transition hover:-translate-y-0.5 hover:bg-[rgba(243,247,255,0.98)]"
        >
          Back to home
        </Link>
      </div>
      <div className="mx-auto max-w-5xl rounded-[32px] border border-[rgba(20,46,92,0.14)] bg-[linear-gradient(145deg,rgba(250,252,255,0.95),rgba(236,244,255,0.9))] p-6 shadow-[0_40px_120px_-40px_rgba(7,29,66,0.18)] backdrop-blur-xl md:p-10">
        <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.32em] text-[var(--accent)]">Administration</p>
            <h1 className="max-w-lg text-4xl font-semibold text-[var(--foreground)]">
              Review student requests, unlock forms, and manage semester intake.
            </h1>
            <p className="max-w-xl text-[var(--muted)]">
              Built for staff workflows with protected actions, audit logs, CSV export, and receipt validation.
            </p>
          </div>
          <AdminLoginForm />
        </div>
      </div>
    </main>
  );
}
