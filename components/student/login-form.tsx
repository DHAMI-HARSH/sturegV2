"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StepIndicator } from "@/components/student/step-indicator";

export function StudentLoginForm() {
  const [fullName, setFullName] = useState("");
  const [ddNumber, setDdNumber] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!receipt) {
      toast.error("Upload the current semester receipt first");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.set("fullName", fullName);
    formData.set("ddNumber", ddNumber);
    formData.set("receipt", receipt);

    try {
      const response = await fetch("/api/auth/student/login", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error ?? "Login request failed");
        return;
      }

      toast.success(data.message ?? "Receipt accepted. Waiting for admin approval.");
      window.location.assign(data.status === "APPROVED" ? "/student/form" : "/student/status");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <StepIndicator current="login" />
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-[28px] border border-[rgba(20,46,92,0.16)] bg-[rgba(244,248,255,0.96)] p-6 shadow-[0_30px_90px_-40px_rgba(7,29,66,0.2)]"
      >
        <Input placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Input placeholder="DD Number" value={ddNumber} onChange={(e) => setDdNumber(e.target.value)} />
        <label className="block rounded-[24px] border border-dashed border-[rgba(20,46,92,0.18)] bg-[rgba(226,236,250,0.72)] p-5 text-sm text-[var(--muted)]">
          <span className="mb-2 block font-semibold text-[var(--foreground)]">Upload fee receipt</span>
          <span className="block">JPG, PNG, or PDF up to 5MB</span>
          <input
            className="mt-4 block w-full text-sm text-[var(--accent-strong)] file:mr-4 file:rounded-full file:border-0 file:bg-[rgba(20,46,92,0.12)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--accent-strong)]"
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
          />
          {receipt ? <p className="mt-3 text-[var(--accent-strong)]">Selected: {receipt.name}</p> : null}
        </label>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Validating receipt..." : "Sign up with name and DD number"}
        </Button>
      </form>
    </div>
  );
}
