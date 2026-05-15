import { createAuditLog, updateStudentById } from "@/lib/db";
import { rejectionEmail, sendMail } from "@/lib/mailer";
import { handleRouteError, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/server-auth";
import { rejectStudentSchema } from "@/lib/validators";

export async function POST(
  request: Request,
  context: RouteContext<"/api/admin/requests/[id]/reject">,
) {
  try {
    const session = await requireAdmin();
    const { id } = await context.params;
    const payload = rejectStudentSchema.parse(await request.json());

    const result = await updateStudentById(id, {
      status: "REJECTED",
      rejectionNote: payload.reason,
    });

    await createAuditLog({
      adminId: session.user.id,
      action: "REJECT_STUDENT",
      targetId: result.id,
      note: payload.reason,
    });

    if (result.email) {
      const mail = rejectionEmail(result.email, payload.reason);
      await sendMail({
        to: result.email,
        subject: mail.subject,
        html: mail.html,
      });
    }

    return ok({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
