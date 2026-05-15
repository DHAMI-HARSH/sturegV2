import { getStudentWithFormByDdNumber } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { handleRouteError, ok } from "@/lib/http";
import { requireStudent } from "@/lib/server-auth";

export async function GET() {
  try {
    const session = await requireStudent();
    const ddNumber = session.user.ddNumber;

    if (!ddNumber) {
      throw new AppError("Student session is missing a DD number.", 401);
    }

    const student = await getStudentWithFormByDdNumber(ddNumber);

    if (!student) {
      throw new AppError("Student not found.", 404);
    }

    return ok({
      studentName: student.studentName,
      ddNumber: student.ddNumber,
      email: student.email,
      status: student.status,
      rejectionNote: student.rejectionNote,
      receiptUrl: student.receiptUrl,
      receiptDate: student.receiptDate,
      receiptValidationStatus: student.receiptValidationStatus,
      receiptValidationMessage: student.receiptValidationMessage,
      lastLoginRequestedAt: student.lastLoginRequestedAt,
      forcePasswordChange: student.forcePasswordChange,
      hasSubmittedForm: Boolean(student.form),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
