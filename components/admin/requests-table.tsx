"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getAdminReceiptReviewHint,
  getReceiptValidationTone,
  parseReceiptOcrDebugText,
} from "@/lib/receipt-ocr";

type RequestItem = {
  id: string;
  ddNumber: string;
  studentName: string | null;
  email: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  receiptUrl: string | null;
  receiptDate: string | null;
  lastLoginRequestedAt: string | null;
  receiptValidationStatus: "VALID" | "INVALID" | "UNREADABLE" | null;
  receiptValidationMessage: string | null;
  receiptOcrDebugText: string | null;
  rejectionNote: string | null;
};

async function fetchReviewRequests() {
  const response = await fetch("/api/admin/requests", { cache: "no-store" });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Could not load review requests.");
  }

  return data.requests ?? [];
}

function getReceiptPreviewSrc(receiptUrl: string) {
  if (!receiptUrl.toLowerCase().endsWith(".pdf")) {
    return receiptUrl;
  }

  return receiptUrl.replace(/\/upload\//, "/upload/pg_1/f_jpg/").replace(/\.pdf$/i, ".jpg");
}

export function RequestsTable() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [previewingRequest, setPreviewingRequest] = useState<RequestItem | null>(null);
  const previewSrc = previewingRequest?.receiptUrl
    ? getReceiptPreviewSrc(previewingRequest.receiptUrl)
    : null;

  useEffect(() => {
    void (async () => {
      try {
        setRequests(await fetchReviewRequests());
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load review requests.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function approve(id: string) {
    const response = await fetch(`/api/admin/requests/${id}/approve`, {
      method: "POST",
    });

    if (!response.ok) {
      const data = await response.json();
      toast.error(data.error ?? "Approval failed");
      return;
    }

    toast.success("Student approved");
    setRequests((current) => current.filter((request) => request.id !== id));
  }

  async function reject() {
    if (!rejectingId) {
      return;
    }

    const response = await fetch(`/api/admin/requests/${rejectingId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: rejectReason }),
    });

    if (!response.ok) {
      const data = await response.json();
      toast.error(data.error ?? "Rejection failed");
      return;
    }

    toast.success("Student rejected");
    setRequests((current) => current.filter((request) => request.id !== rejectingId));
    setRejectingId(null);
    setRejectReason("");
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-[28px] border border-[rgba(20,46,92,0.16)] bg-[rgba(244,248,255,0.96)] shadow-[0_30px_90px_-40px_rgba(7,29,66,0.24)]">
        <table className="w-full text-left text-sm text-[var(--foreground)]">
          <thead className="bg-[rgba(18,45,96,0.08)] text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">DD Number</th>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Receipt</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Validation</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => {
                const ocr = parseReceiptOcrDebugText(request.receiptOcrDebugText);
                const reviewHint = getAdminReceiptReviewHint(request.receiptValidationStatus);

                return (
                  <tr key={request.id} className="border-t border-[rgba(20,46,92,0.12)]">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-[var(--foreground)]">{request.ddNumber}</div>
                      <div className="text-xs text-[var(--muted)]">{request.email ?? "No email yet"}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-[var(--foreground)]">{request.studentName ?? "Name not provided"}</div>
                    </td>
                    <td className="px-4 py-4">
                      {request.lastLoginRequestedAt
                        ? new Date(request.lastLoginRequestedAt).toLocaleString()
                        : "Unknown"}
                    </td>
                    <td className="px-4 py-4">
                      {request.receiptUrl ? (
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewingRequest(request)}
                            className="text-left text-[var(--accent-strong)] underline underline-offset-4"
                          >
                            View receipt
                          </button>
                          <a
                            href={request.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-[var(--muted)] underline underline-offset-4"
                          >
                            Open in new tab
                          </a>
                        </div>
                      ) : (
                        "Missing"
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {request.receiptDate ? new Date(request.receiptDate).toLocaleDateString() : "N/A"}
                    </td>
                    <td className="px-4 py-4">
                      <Badge tone={getReceiptValidationTone(request.receiptValidationStatus)}>
                        {request.receiptValidationStatus ?? "N/A"}
                      </Badge>
                      <div className="mt-2 space-y-1 text-xs text-[var(--muted)]">
                        <p>
                          Receipt no:{" "}
                          <span className="font-medium text-[var(--accent-strong)]">
                            {ocr?.receiptNo ?? "Not found"}
                          </span>
                        </p>
                        <p>
                          Ref no:{" "}
                          <span className="font-medium text-[var(--accent-strong)]">
                            {ocr?.refNo ?? "Not found"}
                          </span>
                        </p>
                        <p>
                          Student name:{" "}
                          <span className="font-medium text-[var(--accent-strong)]">
                            {ocr?.detectedName ?? "Not found"}
                          </span>
                        </p>
                        <p>
                          Receipt date:{" "}
                          <span className="font-medium text-[var(--accent-strong)]">
                            {ocr?.detectedDate ?? "Not found"}
                          </span>
                        </p>
                      </div>
                      <p className="mt-2 max-w-xs text-xs text-[var(--muted)]">
                        {request.receiptValidationMessage ?? request.rejectionNote ?? "Awaiting review"}
                      </p>
                      {reviewHint ? (
                        <p className="mt-2 max-w-xs text-xs text-[var(--warning-foreground)]">{reviewHint}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <Button className="h-9 px-3" onClick={() => approve(request.id)}>
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          className="h-9 px-3"
                          onClick={() => setRejectingId(request.id)}
                        >
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <Modal open={Boolean(rejectingId)} title="Reject Student Request" onClose={() => setRejectingId(null)}>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-[var(--muted)]">Reason</label>
            <Textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Explain why this request is being rejected"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRejectingId(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={reject} disabled={rejectReason.trim().length < 5}>
              Confirm rejection
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(previewingRequest)}
        title={previewingRequest ? `Receipt Preview · ${previewingRequest.ddNumber}` : "Receipt Preview"}
        onClose={() => setPreviewingRequest(null)}
        panelClassName="max-w-5xl"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-[rgba(20,46,92,0.16)] bg-white p-3">
            {previewSrc ? (
              <div className="relative h-[70vh] overflow-hidden rounded-xl border border-[rgba(20,46,92,0.12)] bg-slate-50">
                <Image
                  src={previewSrc}
                  alt="Uploaded receipt preview"
                  fill
                  sizes="(max-width: 768px) 100vw, 80vw"
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="flex h-[40vh] items-center justify-center rounded-xl border border-dashed border-[rgba(20,46,92,0.2)] text-sm text-[var(--muted)]">
                No receipt uploaded
              </div>
            )}
          </div>
          {previewingRequest?.receiptUrl ? (
            <a
              href={previewingRequest.receiptUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-[var(--accent-strong)] underline underline-offset-4"
            >
              Open receipt in a new tab
            </a>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
