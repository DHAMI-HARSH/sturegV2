import { createAuditLog, createStudentAccount } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { studentAccountEmail, sendMail } from "@/lib/mailer";
import { handleRouteError, created } from "@/lib/http";
import { requireAdmin } from "@/lib/server-auth";
import { studentAccountSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const payload = studentAccountSchema.parse(await request.json());
    const password = await hashPassword(payload.temporaryPassword);

    const student = await createStudentAccount({
      ddNumber: payload.ddNumber,
      email: payload.email,
      password,
    });

    await createAuditLog({
      adminId: session.user.id,
      action: "CREATE_STUDENT_ACCOUNT",
      targetId: student.id,
      note: `Created student account ${student.ddNumber}`,
    });

    const mail = studentAccountEmail(student.ddNumber, payload.temporaryPassword);
    await sendMail({
      to: payload.email,
      subject: mail.subject,
      html: mail.html,
    });

    return created({ success: true, student });
  } catch (error) {
    return handleRouteError(error);
  }
}
