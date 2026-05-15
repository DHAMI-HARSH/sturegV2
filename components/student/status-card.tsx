"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/student/step-indicator";
import {
  getReceiptValidationTone,
  getStudentReceiptStatusMessage,
} from "@/lib/receipt-ocr";

type StatusPayload = {
  ddNumber: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionNote: string | null;
  receiptValidationStatus: "VALID" | "INVALID" | "UNREADABLE" | null;
  receiptValidationMessage: string | null;
  hasSubmittedForm: boolean;
};

export function StatusCard() {
  const router = useRouter();
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exiting, setExiting] = useState(false);
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const loadStatus = async (showErrorToast = true) => {
      try {
        const response = await fetch("/api/student/status", {
          cache: "no-store",
          credentials: "include",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Could not load your student status.");
        }

        if (cancelled) {
          return;
        }

        setError(null);
        setStatus(data);

        if (data.status === "APPROVED" && !hasRedirectedRef.current) {
          hasRedirectedRef.current = true;
          toast.success(
            data.hasSubmittedForm ? "Your registration is available." : "You were approved. Opening your form.",
          );
          router.replace("/student/form");
          router.refresh();
        }
      } catch (loadError: unknown) {
        if (cancelled) {
          return;
        }

        const message =
          loadError instanceof Error ? loadError.message : "Could not load your student status.";
        setError(message);
        if (showErrorToast) {
          toast.error(message);
        }
      }
    };

    void loadStatus();
    intervalId = setInterval(() => {
      void loadStatus(false);
    }, 5000);

    return () => {
      cancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [router]);

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
    } catch (exitError: unknown) {
      setExiting(false);
      const message =
        exitError instanceof Error ? exitError.message : "Could not exit the student portal.";
      toast.error(message);
    }
  }

  const current =
    status?.status === "APPROVED" ? (status.hasSubmittedForm ? "done" : "form") : "pending";
  const receiptStatusMessage = getStudentReceiptStatusMessage(status?.receiptValidationStatus ?? null);

  return (
    <div className="space-y-6">
      <StepIndicator current={current} />
      <div className="rounded-[28px] border border-[rgba(20,46,92,0.14)] bg-[rgba(251,253,255,0.97)] p-6 shadow-[0_30px_90px_-40px_rgba(7,29,66,0.22)]">
        <p className="text-sm uppercase tracking-[0.2em] text-[var(--accent)]">Student Status</p>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        <div className="mt-3 flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">{status?.ddNumber ?? "Loading..."}</h1>
          {status ? (
            <Badge
              tone={
                status.status === "APPROVED"
                  ? "success"
                  : status.status === "REJECTED"
                    ? "danger"
                    : "warning"
              }
            >
              {status.status}
            </Badge>
          ) : null}
        </div>
        {status?.status === "PENDING" ? (
          <div className="mt-4 space-y-2 text-[var(--muted)]">
            <p>Your receipt has been submitted and is waiting for admin approval.</p>
            {status.receiptValidationStatus ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[var(--muted)]">Receipt check:</span>
                <Badge tone={getReceiptValidationTone(status.receiptValidationStatus)}>
                  {status.receiptValidationStatus}
                </Badge>
              </div>
            ) : null}
            {receiptStatusMessage ? <p className="text-[var(--warning-foreground)]">{receiptStatusMessage}</p> : null}
            {status.receiptValidationMessage ? (
              <p className="text-sm text-[var(--muted)]">{status.receiptValidationMessage}</p>
            ) : null}
          </div>
        ) : null}
        {status?.status === "REJECTED" ? (
          <div className="mt-4 space-y-2 text-[var(--muted)]">
            <p>Reason: {status.rejectionNote ?? "Not provided"}</p>
            {status.receiptValidationMessage ? (
              <p className="text-sm text-[var(--muted)]">{status.receiptValidationMessage}</p>
            ) : null}
            <div className="pt-2">
              <Button variant="secondary" onClick={exitPortal} disabled={exiting}>
                {exiting ? "Exiting..." : "Exit portal"}
              </Button>
            </div>
          </div>
        ) : null}
        {status?.status === "APPROVED" ? (
          <div className="mt-6">
            <Link href="/student/form">
              <Button>{status.hasSubmittedForm ? "View submitted form" : "Continue to form"}</Button>
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
