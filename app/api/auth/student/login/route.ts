import { fileTypeFromBuffer } from "file-type";
import type { ReceiptValidationStatus, StudentStatus } from "@/lib/db-types";
import { uploadReceipt } from "@/lib/cloudinary";
import {
  createFeeReceipt,
  createStudentAccount,
  getActiveSemesterConfig,
  getFeeReceiptByReceiptNo,
  getFeeReceiptByRefNo,
  getStudentByDdNumber,
  updateStudentById,
} from "@/lib/db";
import { AppError } from "@/lib/errors";
import { handleRouteError, ok } from "@/lib/http";
import { studentLoginRateLimit } from "@/lib/ratelimit";
import { applySessionToResponse } from "@/lib/session";
import { datesAreSuspicious, extractReceiptInsights, validateReceiptIdFormats } from "@/lib/ocr";
import { studentLoginSchema } from "@/lib/validators";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function normalizeRange(date: Date, end = false) {
  const normalized = new Date(date);
  normalized.setHours(end ? 23 : 0, end ? 59 : 0, end ? 59 : 0, end ? 999 : 0);
  return normalized;
}

function manualReviewResponse(input: {
  studentId: string;
  status: StudentStatus;
  ddNumber: string;
  receiptDate: Date | null;
  message: string;
}) {
  return applySessionToResponse(
    ok({
      success: true,
      status: input.status,
      ddNumber: input.ddNumber,
      receiptDate: input.receiptDate,
      requiresManualReview: true,
      message: input.message,
    }),
    {
      role: "student",
      studentId: input.studentId,
      ddNumber: input.ddNumber,
    },
  );
}

async function persistManualReview(input: {
  studentId: string;
  studentName: string;
  ddNumber: string;
  receiptUrl: string;
  receiptDate: Date | null;
  receiptOcrDebugText: string | null;
  receiptValidationStatus: ReceiptValidationStatus;
  receiptValidationMessage: string;
}) {
  const updated = await updateStudentById(input.studentId, {
    studentName: input.studentName,
    receiptUrl: input.receiptUrl,
    receiptDate: input.receiptDate,
    lastLoginRequestedAt: new Date(),
    receiptValidationStatus: input.receiptValidationStatus,
    receiptValidationMessage: input.receiptValidationMessage,
    receiptOcrDebugText: input.receiptOcrDebugText,
    status: "PENDING" as StudentStatus,
    rejectionNote: null,
  });

  return manualReviewResponse({
    studentId: updated.id,
    status: updated.status,
    ddNumber: updated.ddNumber,
    receiptDate: updated.receiptDate,
    message:
      "Receipt uploaded successfully. It has been sent to the admin panel for manual review.",
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const parsed = studentLoginSchema.parse({
      fullName: formData.get("fullName"),
      ddNumber: formData.get("ddNumber"),
    });

    let rateLimit = null;
    try {
      rateLimit = await studentLoginRateLimit.limit(parsed.ddNumber);
    } catch (error) {
      // Fail open if the rate-limit backend is temporarily unavailable.
      console.warn("Student login rate limit check failed; allowing request.", error);
    }

    if (rateLimit && !rateLimit.success) {
      throw new AppError("Too many login attempts. Try again in 15 minutes.", 429);
    }

    const existingStudent = await getStudentByDdNumber(parsed.ddNumber);
    const student =
      existingStudent ??
      (await createStudentAccount({
        studentName: parsed.fullName,
        ddNumber: parsed.ddNumber,
        forcePasswordChange: false,
      }));

    if (existingStudent && existingStudent.studentName !== parsed.fullName) {
      await updateStudentById(existingStudent.id, {
        studentName: parsed.fullName,
      });
    }

    const receipt = formData.get("receipt");
    if (!(receipt instanceof File)) {
      throw new AppError("Receipt upload is required.", 400);
    }

    if (receipt.size > MAX_FILE_SIZE) {
      throw new AppError("Receipt file must be 5MB or smaller.", 400);
    }

    const bytes = Buffer.from(await receipt.arrayBuffer());
    const detectedType = await fileTypeFromBuffer(bytes);
    const effectiveMime = detectedType?.mime ?? receipt.type;

    if (!ALLOWED_MIME_TYPES.has(effectiveMime)) {
      throw new AppError("Only JPG, PNG, and PDF receipts are allowed.", 400);
    }

    const activeConfig = await getActiveSemesterConfig();

    if (!activeConfig) {
      throw new AppError("Semester window is not configured yet. Contact the administrator.", 409);
    }

    const upload = await uploadReceipt({
      bytes,
      ddNumber: student.ddNumber,
      mime: effectiveMime,
      fileName: receipt.name || `${student.ddNumber}-receipt`,
    });

    let receiptDate: Date | null = null;
    let receiptOcrDebugText: string | null = null;
    let extracted: Awaited<ReturnType<typeof extractReceiptInsights>> | null = null;

    try {
      extracted = await extractReceiptInsights({
        expectedFullName: parsed.fullName,
        fileBuffer: bytes,
        uploadedUrl: upload.secureUrl,
        previewUrl: upload.previewUrl,
      });
      receiptDate = extracted.receiptDate ?? extracted.date;
      receiptOcrDebugText = extracted.ocrDebugText;
    } catch (error) {
      const receiptValidationStatus: ReceiptValidationStatus = "UNREADABLE";
      const receiptValidationMessage =
        error instanceof AppError
          ? `${error.message} Manual admin review is required.`
          : "We could not automatically read the receipt details. Your receipt has been sent for manual admin review.";
      const receiptOcrFailureDebugText =
        error instanceof Error ? `OCR failure: ${error.message}` : "OCR failure: unknown error";

      const updated = await updateStudentById(student.id, {
        studentName: parsed.fullName,
        receiptUrl: upload.secureUrl,
        lastLoginRequestedAt: new Date(),
        receiptValidationStatus,
        receiptValidationMessage,
        receiptOcrDebugText: receiptOcrFailureDebugText,
        status: "PENDING" as StudentStatus,
        rejectionNote: null,
      });

      return manualReviewResponse({
        studentId: updated.id,
        status: updated.status,
        ddNumber: updated.ddNumber,
        receiptDate: updated.receiptDate,
        message:
          "Receipt uploaded successfully. Automatic OCR could not fully validate the receipt, so your request is waiting for manual admin review.",
      });
    }

    if (!extracted) {
      throw new AppError("Could not extract receipt details.", 400);
    }

    const receiptNo = extracted.receiptNo;
    const refNo = extracted.refNo;
    if (!receiptNo) {
      return persistManualReview({
        studentId: student.id,
        studentName: parsed.fullName,
        ddNumber: student.ddNumber,
        receiptUrl: upload.secureUrl,
        receiptDate,
        receiptOcrDebugText,
        receiptValidationStatus: "UNREADABLE",
        receiptValidationMessage:
          "Receipt number could not be detected automatically. Manual admin review is required.",
      });
    }

    const formatValidation = validateReceiptIdFormats(receiptNo, refNo);
    if (!formatValidation.valid) {
      return persistManualReview({
        studentId: student.id,
        studentName: parsed.fullName,
        ddNumber: student.ddNumber,
        receiptUrl: upload.secureUrl,
        receiptDate,
        receiptOcrDebugText,
        receiptValidationStatus: "UNREADABLE",
        receiptValidationMessage:
          "Receipt number could not be validated automatically. Manual admin review is required.",
      });
    }

    if (datesAreSuspicious(receiptDate, extracted.chequeDate)) {
      throw new AppError(
        "Receipt date and cheque date are inconsistent. Please upload the original receipt.",
        400,
      );
    }

    const receiptNoDuplicate = await getFeeReceiptByReceiptNo(receiptNo);
    if (receiptNoDuplicate) {
      throw new AppError(
        `Receipt No. ${receiptNo} has already been submitted. Each receipt can only be used once.`,
        409,
      );
    }

    if (refNo) {
      const refNoDuplicate = await getFeeReceiptByRefNo(refNo);
      if (refNoDuplicate) {
        throw new AppError(
          `Ref No. ${refNo} has already been submitted. Each bank transaction can only be used once.`,
          409,
        );
      }
    }

    if (!receiptDate) {
      return persistManualReview({
        studentId: student.id,
        studentName: parsed.fullName,
        ddNumber: student.ddNumber,
        receiptUrl: upload.secureUrl,
        receiptDate,
        receiptOcrDebugText,
        receiptValidationStatus: "UNREADABLE",
        receiptValidationMessage:
          "A receipt was uploaded, but no valid receipt date could be confirmed automatically. Manual admin review is required.",
      });
    }

    if (extracted.matched === false) {
      return persistManualReview({
        studentId: student.id,
        studentName: parsed.fullName,
        ddNumber: student.ddNumber,
        receiptUrl: upload.secureUrl,
        receiptDate,
        receiptOcrDebugText,
        receiptValidationStatus: "INVALID",
        receiptValidationMessage:
          "Receipt date was found, but the name on the receipt does not match the submitted full name. Manual admin review is required.",
      });
    }

    if (extracted.matched === null) {
      return persistManualReview({
        studentId: student.id,
        studentName: parsed.fullName,
        ddNumber: student.ddNumber,
        receiptUrl: upload.secureUrl,
        receiptDate,
        receiptOcrDebugText,
        receiptValidationStatus: "UNREADABLE",
        receiptValidationMessage:
          "Receipt date was found, but the student name could not be confirmed automatically. Manual admin review is required.",
      });
    }

    const start = normalizeRange(activeConfig.startDate);
    const end = normalizeRange(activeConfig.endDate, true);
    const isValidDate = receiptDate >= start && receiptDate <= end;

    if (!isValidDate) {
      await updateStudentById(student.id, {
        studentName: parsed.fullName,
        receiptUrl: upload.secureUrl,
        receiptDate,
        lastLoginRequestedAt: new Date(),
        receiptValidationStatus: "INVALID" as ReceiptValidationStatus,
        receiptValidationMessage: `Receipt date must be between ${start.toDateString()} and ${end.toDateString()}.`,
        receiptOcrDebugText,
        status: "REJECTED" as StudentStatus,
        rejectionNote: "Receipt date is outside the active semester window.",
      });

      throw new AppError(
        `Receipt date is outside the current semester window (${start.toDateString()} to ${end.toDateString()}).`,
        400,
      );
    }

    await createFeeReceipt({
      receiptNo,
      refNo,
      studentName: parsed.fullName,
      receiptDate,
      submittedByStudentId: student.id,
    });

    const updated = await updateStudentById(student.id, {
      studentName: parsed.fullName,
      receiptUrl: upload.secureUrl,
      receiptDate,
      lastLoginRequestedAt: new Date(),
      receiptValidationStatus: "VALID" as ReceiptValidationStatus,
      receiptValidationMessage: "Receipt name and date validated successfully.",
      receiptOcrDebugText,
      status: "APPROVED" as StudentStatus,
      approvedAt: new Date(),
      rejectionNote: null,
    });

    return applySessionToResponse(
      ok({
        success: true,
        status: updated.status,
        ddNumber: updated.ddNumber,
        receiptDate: updated.receiptDate,
        message: "Receipt uploaded successfully. Your receipt was validated and your registration is now unlocked.",
      }),
      {
        role: "student",
        studentId: updated.id,
        ddNumber: updated.ddNumber,
      },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
