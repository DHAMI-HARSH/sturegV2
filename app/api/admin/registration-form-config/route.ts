import {
  createAuditLog,
  getActiveRegistrationFormConfig,
  setActiveRegistrationFormConfig,
} from "@/lib/db";
import { handleRouteError, ok } from "@/lib/http";
import { registrationFormConfigSchema } from "@/lib/registration-form";
import { requireAdmin } from "@/lib/server-auth";

export async function GET() {
  try {
    await requireAdmin();
    const fields = await getActiveRegistrationFormConfig();

    return ok({ fields });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const payload = registrationFormConfigSchema.parse(await request.json());
    const fields = await setActiveRegistrationFormConfig(payload);

    await createAuditLog({
      adminId: session.user.id,
      action: "UPDATE_REGISTRATION_FORM_CONFIG",
      targetId: "registration_form_config",
      note: `Updated registration form config with ${fields.length} fields.`,
    });

    return ok({ success: true, fields });
  } catch (error) {
    return handleRouteError(error);
  }
}
