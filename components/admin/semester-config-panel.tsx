"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SemesterConfig = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
};

export function SemesterConfigPanel() {
  const [current, setCurrent] = useState<SemesterConfig | null>(null);
  const [label, setLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    void fetch("/api/admin/semester-config", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "Could not load semester configuration.");
        }

        setCurrent(data.config ?? null);
      })
      .catch((error: unknown) => {
        toast.error(
          error instanceof Error ? error.message : "Could not load semester configuration.",
        );
      });
  }, []);

  async function saveConfig() {
    const response = await fetch("/api/admin/semester-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      toast.error(data.error ?? "Could not save semester config");
      return;
    }

    toast.success("Semester window updated");
    setCurrent(data.config);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <section className="rounded-[28px] border border-slate-300 bg-[#f8fafc]/94 p-6 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.12)]">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Active Window</p>
        {current ? (
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <p className="text-2xl font-semibold text-slate-900">{current.label}</p>
            <p>Start: {new Date(current.startDate).toLocaleString()}</p>
            <p>End: {new Date(current.endDate).toLocaleString()}</p>
          </div>
        ) : (
          <p className="mt-4 text-slate-500">No active semester window yet.</p>
        )}
      </section>

      <section className="rounded-[28px] border border-slate-300 bg-[#f8fafc]/94 p-6 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.12)]">
        <h2 className="text-lg font-semibold text-slate-900">Set Semester Window</h2>
        <div className="mt-4 space-y-3">
          <Input placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
          <Input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <Button className="w-full" onClick={saveConfig}>
            Save Config
          </Button>
        </div>
      </section>
    </div>
  );
}
