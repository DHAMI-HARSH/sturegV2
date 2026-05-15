import { AccountsPanel } from "@/components/admin/accounts-panel";

export default function AccountsPage() {
  return (
    <section>
      <p className="text-sm uppercase tracking-[0.32em] text-[var(--muted)]">Student Access</p>
      <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">DD-Number Signup Flow</h1>
      <p className="mt-2 max-w-2xl text-[var(--muted)]">
        Students can now create their own access from the student portal using only a DD number and receipt upload.
      </p>
      <div className="mt-6">
        <AccountsPanel />
      </div>
    </section>
  );
}
