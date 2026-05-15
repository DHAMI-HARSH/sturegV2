import { RequestsTable } from "@/components/admin/requests-table";

export default function RequestsPage() {
  return (
    <section>
      <p className="text-sm uppercase tracking-[0.32em] text-[var(--muted)]">Pending Requests</p>
      <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">Fee Receipt Review Queue</h1>
      <p className="mt-2 max-w-2xl text-[var(--muted)]">
        Approve or reject uploaded receipts, with OCR date results, manual-review fallback for unreadable receipts, and direct preview links.
      </p>
      <div className="mt-6">
        <RequestsTable />
      </div>
    </section>
  );
}
