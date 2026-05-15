import { ReportsTable } from "@/components/admin/reports-table";

export default function ReportsPage() {
  return (
    <section>
      <p className="text-sm uppercase tracking-[0.32em] text-[var(--muted)]">Reports</p>
      <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">Approved Registration Reports</h1>
      <p className="mt-2 max-w-2xl text-[var(--muted)]">
        Review approved student submissions with full form details, receipt metadata, and CSV export in one place.
      </p>
      <div className="mt-6">
        <ReportsTable />
      </div>
    </section>
  );
}
