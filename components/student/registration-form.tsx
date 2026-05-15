"use client";

import type { ChangeEvent } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { StepIndicator } from "@/components/student/step-indicator";
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

type FormPayload = {
  student: { ddNumber: string; email: string | null; fullName: string | null };
  form: {
    submittedAt: string;
    formData: Record<string, string>;
  } | null;
  config: RegistrationFieldConfig[];
};

type FormDraft = Record<string, string>;

async function fetchRegistrationPayload() {
  const response = await fetch("/api/student/form", {
    cache: "no-store",
    credentials: "include",
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Could not load the registration form.");
  }

  return data as FormPayload;
}

function createDraft(
  config: RegistrationFieldConfig[],
  payload: FormPayload["student"],
  savedForm: FormPayload["form"],
) {
  const draft: FormDraft = {};

  for (const field of config.filter((item) => item.enabled)) {
    if (savedForm?.formData?.[field.key]) {
      draft[field.key] =
        field.type === "date"
          ? toDateInputValue(savedForm.formData[field.key])
          : savedForm.formData[field.key];
      continue;
    }

    if (field.key === "fullName" && payload.fullName) {
      draft[field.key] = payload.fullName;
      continue;
    }

    if (field.key === "email" && payload.email) {
      draft[field.key] = payload.email;
      continue;
    }

    draft[field.key] = "";
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

export function RegistrationForm() {
  const [payload, setPayload] = useState<FormPayload | null>(null);
  const [draft, setDraft] = useState<FormDraft>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exiting, setExiting] = useState(false);

  async function loadForm(showLoader = true) {
    if (showLoader) {
      setLoading(true);
    }

    setLoadError(null);

    try {
      const formData = await fetchRegistrationPayload();
      setPayload(formData);
      setDraft(createDraft(formData.config, formData.student, formData.form));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not load the registration form.";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    void fetchRegistrationPayload()
      .then((formData) => {
        if (cancelled) {
          return;
        }

        setPayload(formData);
        setDraft(createDraft(formData.config, formData.student, formData.form));
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Could not load the registration form.";
        setLoadError(message);
        toast.error(message);
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

  function updateField(key: string, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    setSubmitting(true);

    try {
      const response = await fetch("/api/student/form", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Form submission failed.");
      }

      toast.success("Registration submitted");
      await loadForm(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Form submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function exitPortal() {
    setExiting(true);

    try {
      const response = await fetch("/api/auth/student/logout", {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "Could not exit the student portal.");
      }

      window.location.assign("/");
    } catch (error) {
      setExiting(false);
      toast.error(error instanceof Error ? error.message : "Could not exit the student portal.");
    }
  }

  if (loading) {
    return (
      <div className="rounded-[28px] border border-[rgba(20,46,92,0.14)] bg-[rgba(251,253,255,0.97)] p-6 text-[var(--foreground)]">
        Loading form...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-6 text-rose-700">
        {loadError}
      </div>
    );
  }

  if (!payload) {
    return null;
  }

  const liveFields = payload.config.filter((field) => field.enabled);

  if (payload.form) {
    return (
      <div className="space-y-6">
        <StepIndicator current="done" />
        <div className="rounded-[28px] border border-[rgba(20,46,92,0.14)] bg-[rgba(251,253,255,0.97)] p-6 shadow-[0_30px_90px_-40px_rgba(7,29,66,0.22)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[var(--foreground)]">Registration Submitted</h1>
              <p className="mt-2 text-[var(--muted)]">
                Your details are now locked and available in read-only mode.
              </p>
            </div>
            <Button variant="secondary" onClick={exitPortal} disabled={exiting}>
              {exiting ? "Exiting..." : "Exit"}
            </Button>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {liveFields.map((field) => (
              <div key={field.id} className="rounded-2xl border border-[rgba(20,46,92,0.12)] bg-[rgba(237,244,253,0.72)] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[#7d95b8]">{field.label}</p>
                <p className="mt-2 text-sm text-[var(--foreground)]">
                  {renderFieldValue(field, payload.form?.formData[field.key] ?? "")}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StepIndicator current="form" />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="space-y-6 rounded-[28px] border border-[rgba(20,46,92,0.14)] bg-[rgba(251,253,255,0.97)] p-6 shadow-[0_30px_90px_-40px_rgba(7,29,66,0.22)]"
      >
        <div className="grid gap-4 md:grid-cols-2">
          {liveFields.map((field) => {
            const commonProps = {
              placeholder: field.placeholder || field.label,
              value: draft[field.key] ?? "",
              onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                updateField(field.key, event.target.value),
              required: field.required,
            };

            if (field.type === "textarea") {
              return (
                <div key={field.id} className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-[var(--accent-strong)]">{field.label}</label>
                  <Textarea {...commonProps} />
                </div>
              );
            }

            return (
              <div key={field.id}>
                <label className="mb-2 block text-sm font-medium text-[var(--accent-strong)]">{field.label}</label>
                <Input
                  {...commonProps}
                  type={field.type === "date" || field.type === "email" || field.type === "number" ? field.type : "text"}
                  step={field.type === "number" && field.key === "cgpa" ? "0.01" : undefined}
                />
              </div>
            );
          })}
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit registration"}
        </Button>
      </form>
    </div>
  );
}
