import { getStudentByDdNumber, updateStudentById } from "@/lib/db";
import { changePasswordSchema } from "@/lib/validators";
import { handleRouteError, ok } from "@/lib/http";
import { requireStudent } from "@/lib/server-auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { AppError } from "@/lib/errors";

export async function POST(request: Request) {
  try {
    const session = await requireStudent();
    const payload = changePasswordSchema.parse(await request.json());
    const ddNumber = session.user.ddNumber;

    if (!ddNumber) {
      throw new AppError("Student session is missing a DD number.", 401);
    }

    const student = await getStudentByDdNumber(ddNumber);

    if (!student) {
      throw new AppError("Student not found.", 404);
    }

    const validCurrent = await verifyPassword(payload.currentPassword, student.password);
    if (!validCurrent) {
      throw new AppError("Current password is incorrect.", 400);
    }

    const password = await hashPassword(payload.newPassword);

    await updateStudentById(student.id, {
      password,
      forcePasswordChange: false,
    });

    return ok({ success: true, message: "Password updated successfully." });
  } catch (error) {
    return handleRouteError(error);
  }
}
