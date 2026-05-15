"use client";

import { startTransition, useEffect, useState } from "react";
import {
  Copy,
  GripVertical,
  LayoutTemplate,
  Plus,
  Save,
  Settings2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

const FIELD_TYPE_OPTIONS: RegistrationFieldConfig["type"][] = [
  "text",
  "email",
  "number",
  "date",
  "textarea",
];

function createCustomField(): RegistrationFieldConfig {
  const id = crypto.randomUUID();

  return {
    id,
    key: `custom_field_${id.slice(0, 8)}`,
    label: "New Field",
    type: "text",
    placeholder: "New Field",
    required: false,
    enabled: true,
    system: false,
  };
}

function insertAt<T>(items: T[], index: number, item: T) {
  const next = [...items];
  next.splice(index, 0, item);
  return next;
}

export function RegistrationFormConfigPanel() {
  const [fields, setFields] = useState<RegistrationFieldConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
  const [deleteMode, setDeleteMode] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/admin/registration-form-config", {
      cache: "no-store",
    })
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Could not load registration form config.");
        }

        if (!cancelled) {
          const nextFields = (data.fields ?? []) as RegistrationFieldConfig[];
          setFields(nextFields);
          setActiveFieldId(nextFields[0]?.id ?? null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          toast.error(
            error instanceof Error ? error.message : "Could not load registration form config.",
          );
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

  const activeField = fields.find((field) => field.id === activeFieldId) ?? null;

  function updateField(
    id: string,
    updater: (field: RegistrationFieldConfig) => RegistrationFieldConfig,
  ) {
    setFields((current) => current.map((field) => (field.id === id ? updater(field) : field)));
  }

  function addCustomField() {
    const field = createCustomField();
    setFields((current) => [...current, field]);
    setActiveFieldId(field.id);
  }

  function duplicateField(field: RegistrationFieldConfig) {
    const id = crypto.randomUUID();
    const copy: RegistrationFieldConfig = {
      ...field,
      id,
      key: `${field.key}_copy_${id.slice(0, 4)}`,
      label: `${field.label} Copy`,
      system: false,
    };

    setFields((current) => {
      const index = current.findIndex((item) => item.id === field.id);
      return insertAt(current, index + 1, copy);
    });
    setActiveFieldId(copy.id);
  }

  function removeField(id: string) {
    setFields((current) => {
      const next = current.filter((item) => item.id !== id);

      if (activeFieldId === id) {
        setActiveFieldId(next[0]?.id ?? null);
      }

      return next;
    });
  }

  function moveFieldToIndex(dragId: string, targetIndex: number) {
    setFields((current) => {
      const sourceIndex = current.findIndex((field) => field.id === dragId);

      if (sourceIndex < 0) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  async function saveConfig() {
    setSaving(true);

    try {
      const response = await fetch("/api/admin/registration-form-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Could not save registration form config.");
      }

      startTransition(() => {
        const nextFields = (data.fields ?? []) as RegistrationFieldConfig[];
        setFields(nextFields);
        setActiveFieldId((current) =>
          nextFields.some((field) => field.id === current) ? current : nextFields[0]?.id ?? null,
        );
      });
      toast.success("Registration form updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save registration form config.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-[32px] border border-slate-300 bg-[#f8fafc]/94 p-6 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.12)]">
        <p className="text-slate-500">Loading form editor...</p>
      </section>
    );
  }

  return (
    <section className="rounded-[32px] border border-slate-300 bg-[radial-gradient(circle_at_top,_rgba(191,219,254,0.42),_rgba(248,250,252,0.96)_38%,_rgba(255,255,255,0.98)_100%)] p-6 shadow-[0_34px_110px_-42px_rgba(15,23,42,0.22)]">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-sky-700">Form Editor</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Drag-and-Drop Registration Designer</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Reorder fields by dragging cards in the canvas. Custom fields can be duplicated or deleted,
            and the save button pushes the new structure live for students and admins.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setDeleteMode((current) => !current)}>
            <Trash2 className="mr-2 h-4 w-4" />
            {deleteMode ? "Close delete zone" : "Open delete zone"}
          </Button>
          <Button variant="secondary" onClick={addCustomField}>
            <Plus className="mr-2 h-4 w-4" />
            Add field
          </Button>
          <Button onClick={saveConfig} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save live form"}
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-4">
          <div className="rounded-[28px] border border-slate-200 bg-white/92 p-5 shadow-[0_25px_60px_-40px_rgba(15,23,42,0.2)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Canvas</p>
                <p className="text-sm text-slate-500">Drag cards to reorder the live form.</p>
              </div>
              <div className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs uppercase tracking-[0.18em] text-sky-700">
                {fields.length} fields
              </div>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => {
                const isActive = field.id === activeFieldId;
                const isDragging = field.id === draggedFieldId;

                return (
                  <div
                    key={field.id}
                    draggable
                    onDragStart={() => setDraggedFieldId(field.id)}
                    onDragEnd={() => setDraggedFieldId(null)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();

                      if (!draggedFieldId || draggedFieldId === field.id) {
                        return;
                      }

                      moveFieldToIndex(draggedFieldId, index);
                      setDraggedFieldId(null);
                    }}
                    onClick={() => setActiveFieldId(field.id)}
                    className={`cursor-pointer rounded-[24px] border p-4 transition ${
                      isActive
                        ? "border-sky-300 bg-sky-50/80 shadow-[0_18px_45px_-35px_rgba(2,132,199,0.5)]"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70"
                    } ${isDragging ? "opacity-55" : "opacity-100"}`}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-0.5 rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-500">
                          <GripVertical className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold text-slate-900">{field.label}</p>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                              {field.type}
                            </span>
                            {field.system ? (
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] uppercase tracking-[0.16em] text-amber-700">
                                System
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 truncate text-sm text-slate-500">{field.key}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          className="h-9 px-3"
                          onClick={(event) => {
                            event.stopPropagation();
                            duplicateField(field);
                          }}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </Button>
                        <Button
                          variant="secondary"
                          className="h-9 px-3"
                          onClick={(event) => {
                            event.stopPropagation();
                            updateField(field.id, (current) => ({
                              ...current,
                              enabled: !current.enabled,
                            }));
                          }}
                        >
                          {field.enabled ? "Hide" : "Show"}
                        </Button>
                        {!field.system ? (
                          <Button
                            variant="ghost"
                            className="h-9 px-3 text-rose-600"
                            onClick={(event) => {
                              event.stopPropagation();
                              removeField(field.id);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>{field.required ? "Required" : "Optional"}</span>
                    <span>{field.enabled ? "Visible to students" : "Hidden from students"}</span>
                      <span>{field.placeholder || "No placeholder"}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {deleteMode ? (
              <div
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();

                  if (!draggedFieldId) {
                    return;
                  }

                  const dragged = fields.find((field) => field.id === draggedFieldId);
                  if (!dragged) {
                    return;
                  }

                  if (dragged.system) {
                    toast.error("System fields cannot be deleted.");
                    setDraggedFieldId(null);
                    return;
                  }

                  removeField(draggedFieldId);
                  setDraggedFieldId(null);
                  toast.success(`Deleted "${dragged.label}"`);
                }}
                className="mt-5 rounded-[24px] border border-dashed border-rose-300 bg-rose-50/80 p-5 text-center text-sm text-rose-700"
              >
                <Trash2 className="mx-auto mb-2 h-5 w-5" />
                Drag a custom field here to delete it
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[28px] border border-slate-200 bg-white/94 p-5 shadow-[0_25px_60px_-40px_rgba(15,23,42,0.18)]">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-600">
                <Settings2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Field Settings</p>
                <p className="text-sm text-slate-500">Select a field card to edit it.</p>
              </div>
            </div>

            {activeField ? (
              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Label</label>
                  <Input
                    value={activeField.label}
                    onChange={(event) =>
                      updateField(activeField.id, (current) => ({
                        ...current,
                        label: event.target.value,
                      }))
                    }
                    placeholder="Field label"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Field Key</label>
                  <Input
                    value={activeField.key}
                    onChange={(event) =>
                      updateField(activeField.id, (current) => ({
                        ...current,
                        key: event.target.value,
                      }))
                    }
                    placeholder="field_key"
                    disabled={activeField.system}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Type</label>
                  <select
                    value={activeField.type}
                    onChange={(event) =>
                      updateField(activeField.id, (current) => ({
                        ...current,
                        type: event.target.value as RegistrationFieldConfig["type"],
                      }))
                    }
                    disabled={activeField.system}
                    className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50/90 px-3 text-sm text-slate-900 outline-none focus:border-slate-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {FIELD_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Placeholder</label>
                  <Input
                    value={activeField.placeholder}
                    onChange={(event) =>
                      updateField(activeField.id, (current) => ({
                        ...current,
                        placeholder: event.target.value,
                      }))
                    }
                    placeholder="Placeholder"
                  />
                </div>

                <div className="grid gap-2">
                  {!activeField.system ? (
                    <Button
                      variant="secondary"
                      className="justify-start"
                      onClick={() =>
                        updateField(activeField.id, (current) => ({
                          ...current,
                          required: !current.required,
                        }))
                      }
                    >
                      {activeField.required ? "Make optional" : "Make required"}
                    </Button>
                  ) : null}

                  <Button
                    variant="secondary"
                    className="justify-start"
                    onClick={() =>
                      updateField(activeField.id, (current) => ({
                        ...current,
                        enabled: !current.enabled,
                      }))
                    }
                  >
                    {activeField.enabled ? "Hide field from live form" : "Show field in live form"}
                  </Button>

                  {!activeField.system ? (
                    <Button
                      variant="ghost"
                      className="justify-start text-rose-600"
                      onClick={() => removeField(activeField.id)}
                    >
                      Delete this field
                    </Button>
                  ) : (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                      System fields can be hidden, but they still stay in the schema so reports and exports keep working.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                Select a field from the canvas to edit its settings.
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white/94 p-5 shadow-[0_25px_60px_-40px_rgba(15,23,42,0.18)]">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-600">
                <LayoutTemplate className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Live Preview</p>
                <p className="text-sm text-slate-500">This is the order students will see.</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {fields.filter((field) => field.enabled).map((field) => (
                <div key={field.id} className="rounded-2xl border border-slate-200 bg-slate-50/85 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{field.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{field.type}</p>
                    </div>
                    {field.required ? (
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-sky-700">
                        Required
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 h-11 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-400">
                    {field.placeholder || field.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
