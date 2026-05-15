import { createAuditLog, updateStudentById } from "@/lib/db";
import { approvalEmail, sendMail } from "@/lib/mailer";
import { handleRouteError, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/server-auth";

export async function POST(
  _request: Request,
  context: RouteContext<"/api/admin/requests/[id]/approve">,
) {
  try {
    const session = await requireAdmin();
    const { id } = await context.params;

    const result = await updateStudentById(id, {
      status: "APPROVED",
      rejectionNote: null,
      approvedAt: new Date(),
    });

    await createAuditLog({
      adminId: session.user.id,
      action: "APPROVE_STUDENT",
      targetId: result.id,
      note: `Approved DD number ${result.ddNumber}`,
    });

    if (result.email) {
      const mail = approvalEmail(result.email);
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
