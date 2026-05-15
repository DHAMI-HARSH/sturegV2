import { createAuditLog, updateStudentById } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { passwordResetEmail, sendMail } from "@/lib/mailer";
import { handleRouteError, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/server-auth";
import { resetPasswordSchema } from "@/lib/validators";

export async function POST(
  request: Request,
  context: RouteContext<"/api/admin/accounts/[id]/reset-password">,
) {
  try {
    const session = await requireAdmin();
    const payload = resetPasswordSchema.parse(await request.json());
    const { id } = await context.params;
    const password = await hashPassword(payload.temporaryPassword);

    const student = await updateStudentById(id, {
      password,
      forcePasswordChange: true,
    });

    await createAuditLog({
      adminId: session.user.id,
      action: "RESET_STUDENT_PASSWORD",
      targetId: student.id,
      note: `Password reset for ${student.ddNumber}`,
    });

    if (student.email) {
      const mail = passwordResetEmail(student.ddNumber, payload.temporaryPassword);
      await sendMail({
        to: student.email,
        subject: mail.subject,
        html: mail.html,
      });
    }

    return ok({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
