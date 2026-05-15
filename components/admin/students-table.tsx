"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";

type StudentRow = {
  id: string;
  ddNumber: string;
  approvedAt: string | null;
  form: {
    fullName: string;
    branch: string;
    semester: number;
    email: string;
    phone: string;
    course: string;
    address: string;
    parentName: string;
    emergencyContact: string;
    cgpa: number;
  } | null;
};

export function StudentsTable() {
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<StudentRow | null>(null);

  async function loadStudents(search = "") {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/students?query=${encodeURIComponent(search)}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Could not load approved students.");
      }

      setRows(data.students ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load approved students.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/admin/students", { cache: "no-store" });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Could not load approved students.");
        }

        setRows(data.students ?? []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load approved students.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function exportCsv() {
    const response = await fetch("/api/admin/export/csv");
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      toast.error(data?.error ?? "CSV export failed");
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "student-registrations.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name or DD number"
          />
          <Button variant="secondary" onClick={() => loadStudents(query)}>
            Search
          </Button>
        </div>
        <Button onClick={exportCsv}>Export CSV</Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-slate-300 bg-[#f8fafc]/94 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.12)]">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-100/90 text-xs uppercase tracking-[0.2em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Semester</th>
                <th className="px-4 py-3">Approved</th>
                <th className="px-4 py-3 text-right">View</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-200">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-slate-900">{row.form?.fullName ?? "No form"}</div>
                    <div className="text-xs text-slate-500">{row.ddNumber}</div>
                  </td>
                  <td className="px-4 py-4">
                    <Badge>{row.form?.branch ?? "N/A"}</Badge>
                  </td>
                  <td className="px-4 py-4">{row.form?.semester ?? "-"}</td>
                  <td className="px-4 py-4">
                    {row.approvedAt ? new Date(row.approvedAt).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Button variant="secondary" className="h-9 px-3" onClick={() => setSelected(row)}>
                      Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={Boolean(selected)} title="Student Submission" onClose={() => setSelected(null)}>
        {selected?.form ? (
          <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
            <div><span className="text-slate-500">DD Number</span><p className="text-slate-900">{selected.ddNumber}</p></div>
            <div><span className="text-slate-500">Name</span><p className="text-slate-900">{selected.form.fullName}</p></div>
            <div><span className="text-slate-500">Course</span><p className="text-slate-900">{selected.form.course}</p></div>
            <div><span className="text-slate-500">Branch</span><p className="text-slate-900">{selected.form.branch}</p></div>
            <div><span className="text-slate-500">Semester</span><p className="text-slate-900">{selected.form.semester}</p></div>
            <div><span className="text-slate-500">CGPA</span><p className="text-slate-900">{selected.form.cgpa}</p></div>
            <div><span className="text-slate-500">Email</span><p className="text-slate-900">{selected.form.email}</p></div>
            <div><span className="text-slate-500">Phone</span><p className="text-slate-900">{selected.form.phone}</p></div>
            <div className="sm:col-span-2"><span className="text-slate-500">Address</span><p className="text-slate-900">{selected.form.address}</p></div>
            <div><span className="text-slate-500">Parent</span><p className="text-slate-900">{selected.form.parentName}</p></div>
            <div><span className="text-slate-500">Emergency</span><p className="text-slate-900">{selected.form.emergencyContact}</p></div>
          </div>
        ) : (
          <p className="text-slate-500">No registration form found.</p>
        )}
      </Modal>
    </>
  );
}
