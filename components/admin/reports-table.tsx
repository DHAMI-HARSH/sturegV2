"use client";

import type { ChangeEvent } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { toDateInputValue } from "@/lib/registration-form";

type RegistrationFieldConfig = {
  id: string;
  key: string;
  label: string;
  type: "text" | "email" | "number" | "date" | "textarea";
  placeholder: string;
  required: boolean;
  enabled: boolean;
  system: boolean;
};

type ReportForm = {
  fullName: string;
  submittedAt: string;
  formData: Record<string, string>;
};

type ReportRow = {
  id: string;
  ddNumber: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  email: string | null;
  receiptUrl: string | null;
  receiptDate: string | null;
  approvedAt: string | null;
  receiptValidationStatus: "VALID" | "INVALID" | "UNREADABLE" | null;
  receiptValidationMessage: string | null;
  form: ReportForm | null;
};

type EditableForm = Record<string, string>;

async function fetchReports(search = "") {
  const response = await fetch(`/api/admin/students?query=${encodeURIComponent(search)}`, {
    cache: "no-store",
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Could not load reports.");
  }

  return data.students as ReportRow[];
}

async function fetchStudentReport(id: string) {
  const response = await fetch(`/api/admin/students/${id}`, {
    cache: "no-store",
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Could not load the student report.");
  }

  return data.student as ReportRow;
}

async function fetchRegistrationConfig() {
  const response = await fetch("/api/admin/registration-form-config", {
    cache: "no-store",
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Could not load registration form config.");
  }

  return (data.fields ?? []) as RegistrationFieldConfig[];
}

function createEditableForm(
  row: ReportRow,
  fields: RegistrationFieldConfig[],
): EditableForm {
  const draft: EditableForm = {};

  for (const field of fields.filter((item) => item.enabled)) {
    const value = row.form?.formData?.[field.key] ?? "";
    draft[field.key] = field.type === "date" ? toDateInputValue(value) : value;
  }

  return draft;
}

function renderFieldValue(field: RegistrationFieldConfig, value: string) {
  if (!value) {
    return "-";
  }

  if (field.type === "date") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  }

  return value;
}

export function ReportsTable() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [fields, setFields] = useState<RegistrationFieldConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ReportRow | null>(null);
  const [draft, setDraft] = useState<EditableForm | null>(null);
  const [loadingSelected, setLoadingSelected] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadReports(search = "") {
    setLoading(true);

    try {
      const [nextRows, nextFields] = await Promise.all([
        fetchReports(search),
        fields.length ? Promise.resolve(fields) : fetchRegistrationConfig(),
      ]);

      setRows(nextRows);
      if (!fields.length) {
        setFields(nextFields);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load reports.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    void Promise.all([fetchReports(), fetchRegistrationConfig()])
      .then(([nextRows, nextFields]) => {
        if (cancelled) {
          return;
        }

        setRows(nextRows);
        setFields(nextFields);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Could not load reports.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function openReport(id: string) {
    setLoadingSelected(true);

    try {
      const [student, liveFields] = await Promise.all([
        fetchStudentReport(id),
        fields.length ? Promise.resolve(fields) : fetchRegistrationConfig(),
      ]);
      setFields(liveFields);
      setSelected(student);
      setDraft(createEditableForm(student, liveFields));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load the student report.");
    } finally {
      setLoadingSelected(false);
    }
  }

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
    anchor.download = "student-registration-reports.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function closeModal() {
    setSelected(null);
    setDraft(null);
    setSaving(false);
  }

  function updateDraft(key: string, value: string) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  async function saveDraft() {
    if (!selected || !draft) {
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/admin/students/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Could not save the student form.");
      }

      const updated = data.student as ReportRow;
      setSelected(updated);
      setDraft(createEditableForm(updated, fields));
      setRows((current) => current.map((row) => (row.id === updated.id ? updated : row)));
      toast.success("Student form updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the student form.");
    } finally {
      setSaving(false);
    }
  }

  const liveFields = fields.filter((field) => field.enabled);

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search approved students"
          />
          <Button variant="secondary" onClick={() => loadReports(query)}>
            Search
          </Button>
        </div>
        <Button onClick={exportCsv}>Export CSV</Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-slate-300 bg-[#f8fafc]/94 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.12)]">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-100/90 text-xs uppercase tracking-[0.2em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Semester</th>
                <th className="px-4 py-3">Receipt</th>
                <th className="px-4 py-3">Approved</th>
                <th className="px-4 py-3 text-right">Report</th>
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
                    <div>{row.form?.formData.course ?? "-"}</div>
                    <div className="text-xs text-slate-500">{row.form?.formData.branch ?? "-"}</div>
                  </td>
                  <td className="px-4 py-4">{row.form?.formData.semester ?? "-"}</td>
                  <td className="px-4 py-4">
                    <Badge
                      tone={
                        row.receiptValidationStatus === "VALID"
                          ? "success"
                          : row.receiptValidationStatus === "INVALID"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {row.receiptValidationStatus ?? "N/A"}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    {row.approvedAt ? new Date(row.approvedAt).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Button variant="secondary" className="h-9 px-3" onClick={() => openReport(row.id)}>
                      Manage form
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={Boolean(selected)}
        title={selected ? `Student Form Workspace · ${selected.ddNumber}` : "Student Form Workspace"}
        onClose={closeModal}
        panelClassName="max-w-6xl"
      >
        {loadingSelected || !selected || !draft ? (
          <div className="space-y-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-slate-900">
                  Admin can edit this registration form directly.
                </p>
                <p>Changes update Supabase immediately when you save.</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setDraft(createEditableForm(selected, fields))}
                >
                  Reset edits
                </Button>
                <Button onClick={saveDraft} disabled={saving}>
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="mb-4 text-sm font-semibold text-slate-900">Editable Form</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    {liveFields.map((field) => {
                      const commonProps = {
                        value: draft[field.key] ?? "",
                        onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                          updateDraft(field.key, event.target.value),
                        placeholder: field.placeholder || field.label,
                      };

                      if (field.type === "textarea") {
                        return (
                          <div key={field.id} className="md:col-span-2">
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                              {field.label}
                            </label>
                            <Textarea {...commonProps} />
                          </div>
                        );
                      }

                      return (
                        <div key={field.id}>
                          <label className="mb-2 block text-sm font-medium text-slate-700">
                            {field.label}
                          </label>
                          <Input
                            {...commonProps}
                            type={
                              field.type === "date" ||
                              field.type === "email" ||
                              field.type === "number"
                                ? field.type
                                : "text"
                            }
                            step={field.type === "number" && field.key === "cgpa" ? "0.01" : undefined}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="mb-4 text-sm font-semibold text-slate-900">Form Preview</p>
                  <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                    <div>
                      <span className="text-slate-500">DD Number</span>
                      <p className="text-slate-900">{selected.ddNumber}</p>
                    </div>
                    {liveFields.map((field) => (
                      <div
                        key={field.id}
                        className={field.type === "textarea" ? "sm:col-span-2" : undefined}
                      >
                        <span className="text-slate-500">{field.label}</span>
                        <p className="text-slate-900">
                          {renderFieldValue(field, draft[field.key] ?? "")}
                        </p>
                      </div>
                    ))}
                    <div>
                      <span className="text-slate-500">Receipt Date</span>
                      <p className="text-slate-900">
                        {selected.receiptDate
                          ? new Date(selected.receiptDate).toLocaleDateString()
                          : "Not detected"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Receipt Validation</span>
                      <p className="text-slate-900">{selected.receiptValidationStatus ?? "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Approved At</span>
                      <p className="text-slate-900">
                        {selected.approvedAt ? new Date(selected.approvedAt).toLocaleString() : "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Submitted At</span>
                      <p className="text-slate-900">
                        {selected.form?.submittedAt
                          ? new Date(selected.form.submittedAt).toLocaleString()
                          : "Will be created on save"}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-500">Validation Notes</span>
                      <p className="text-slate-900">
                        {selected.receiptValidationMessage ?? "No notes available."}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-500">Receipt Preview</span>
                      <p className="text-slate-900">
                        {selected.receiptUrl ? (
                          <a
                            href={selected.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-700 underline underline-offset-4"
                          >
                            Open uploaded receipt
                          </a>
                        ) : (
                          "No receipt uploaded"
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
