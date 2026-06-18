import type { ReceiptValidationStatus } from "@/lib/db-types";

export type ParsedReceiptOcrDebug = {
  receiptNo: string | null;
  refNo: string | null;
  detectedDate: string | null;
  detectedName: string | null;
  nameMatched: "yes" | "no" | "uncertain" | null;
  rawText: string | null;
};

function parseLabeledLine(debugText: string, label: string) {
  const match = debugText.match(new RegExp(`^${label}\\s*:\\s*(.+)$`, "mi"));
  return match?.[1]?.trim() ?? null;
}

export function parseReceiptOcrDebugText(debugText: string | null): ParsedReceiptOcrDebug | null {
  if (!debugText) {
    return null;
  }

  const nameMatched = parseLabeledLine(debugText, "Name matched");
  const normalizedMatch =
    nameMatched === "yes" || nameMatched === "no" || nameMatched === "uncertain"
      ? nameMatched
      : null;

  return {
    receiptNo: parseLabeledLine(debugText, "Receipt No"),
    refNo: parseLabeledLine(debugText, "Ref No"),
    detectedDate: parseLabeledLine(debugText, "Detected date"),
    detectedName: parseLabeledLine(debugText, "Detected name"),
    nameMatched: normalizedMatch,
    rawText: parseLabeledLine(debugText, "OCR text"),
  };
}

export function getReceiptValidationTone(status: ReceiptValidationStatus | null) {
  if (status === "VALID") {
    return "success" as const;
  }

  if (status === "INVALID") {
    return "danger" as const;
  }

  return "warning" as const;
}

export function getStudentReceiptStatusMessage(status: ReceiptValidationStatus | null) {
  if (status === "INVALID") {
    return "We found details on the receipt, but something needs manual verification before approval.";
  }

  if (status === "UNREADABLE") {
    return "Automatic OCR could not confirm the receipt fully. An admin can still review it manually.";
  }

  return null;
}

export function getAdminReceiptReviewHint(status: ReceiptValidationStatus | null) {
  if (status === "INVALID") {
    return "OCR found a date, but the receipt details did not fully match the submitted student record.";
  }

  if (status === "UNREADABLE") {
    return "OCR fallback: inspect the receipt preview and decide manually.";
  }

  return null;
}
