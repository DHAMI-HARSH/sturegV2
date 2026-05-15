import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen px-4 py-16">
      <div className="mx-auto max-w-6xl rounded-[32px] border border-[rgba(20,46,92,0.14)] bg-[linear-gradient(145deg,rgba(250,252,255,0.95),rgba(236,244,255,0.9))] p-8 shadow-[0_40px_120px_-40px_rgba(7,29,66,0.2)] backdrop-blur-xl md:p-12">
        <div className="grid gap-10 md:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <p className="text-sm uppercase tracking-[0.32em] text-[var(--accent)]">Student Registration Portal</p>
            <h1 className="max-w-2xl text-5xl font-semibold leading-tight text-[var(--foreground)]">
              One portal for student intake, one control room for admin review.
            </h1>
            <p className="max-w-xl text-lg text-[var(--muted)]">
              Receipt validation, approval workflow, protected registration forms, semester window checks, and CSV exports.
            </p>
          </div>
          <div className="grid gap-4">
            <Link
              href="/student/login"
              className="rounded-[28px] border border-[rgba(31,79,153,0.14)] bg-linear-to-br from-[rgba(23,63,126,0.16)] via-[rgba(89,135,204,0.12)] to-white p-6 transition duration-200 hover:-translate-y-1 hover:border-[rgba(31,79,153,0.34)]"
            >
              <p className="text-sm uppercase tracking-[0.22em] text-[var(--accent)]">Student</p>
              <h2 className="mt-3 text-2xl font-semibold text-[var(--foreground)]">Open Student Portal</h2>
              <p className="mt-2 text-[var(--muted)]">Upload semester fee receipt, check status, and complete the registration form.</p>
            </Link>
            <Link
              href="/admin/login"
              className="rounded-[28px] border border-[rgba(20,46,92,0.14)] bg-[rgba(252,253,255,0.95)] p-6 transition duration-200 hover:-translate-y-1 hover:border-[rgba(31,79,153,0.28)]"
            >
              <p className="text-sm uppercase tracking-[0.22em] text-[var(--accent)]">Admin</p>
              <h2 className="mt-3 text-2xl font-semibold text-[var(--foreground)]">Open Admin Portal</h2>
              <p className="mt-2 text-[var(--muted)]">Review receipt uploads, manage accounts, set semester dates, and export responses.</p>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
