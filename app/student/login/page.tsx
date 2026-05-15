import { StudentLoginForm } from "@/components/student/login-form";
import { getStudentSession } from "@/lib/session";

export default async function StudentLoginPage() {
  const session = await getStudentSession();

  return (
    <main className="min-h-screen px-4 py-14">
      <div className="mx-auto grid max-w-6xl gap-10 rounded-[32px] border border-[rgba(20,46,92,0.14)] bg-[linear-gradient(145deg,rgba(250,252,255,0.95),rgba(236,244,255,0.9))] p-6 shadow-[0_40px_120px_-40px_rgba(7,29,66,0.18)] backdrop-blur-xl md:grid-cols-[1fr_1.05fr] md:p-10">
        <div className="space-y-5">
          <p className="text-sm uppercase tracking-[0.32em] text-[var(--accent)]">Student Portal</p>
          <h1 className="max-w-lg text-4xl font-semibold text-[var(--foreground)]">
            Sign up with your DD number, submit your receipt, then wait for approval.
          </h1>
          <p className="max-w-xl text-[var(--muted)]">
            The portal now creates your student access automatically from your DD number. Keep your DD number and
            current semester receipt ready.
          </p>
          {session ? (
            <div className="max-w-xl rounded-[22px] border border-[rgba(31,79,153,0.18)] bg-[rgba(31,79,153,0.08)] px-4 py-3 text-sm text-[var(--accent-strong)]">
              Another student can sign in on this device with a different DD number. Submitting a new receipt login
              will replace the current student session.
            </div>
          ) : null}
        </div>
        <StudentLoginForm />
      </div>
    </main>
  );
}
