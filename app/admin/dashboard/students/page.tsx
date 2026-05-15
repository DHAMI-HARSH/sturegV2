import { StudentsTable } from "@/components/admin/students-table";

export default function StudentsPage() {
  return (
    <section>
      <p className="text-sm uppercase tracking-[0.32em] text-[var(--muted)]">Registered Students</p>
      <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">Submitted Registration Forms</h1>
      <p className="mt-2 max-w-2xl text-[var(--muted)]">
        Search approved students, inspect full responses, and export records to CSV.
      </p>
      <div className="mt-6">
        <StudentsTable />
      </div>
    </section>
  );
}
