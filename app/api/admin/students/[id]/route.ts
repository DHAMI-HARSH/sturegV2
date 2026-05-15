import {
  createAuditLog,
  getActiveRegistrationFormConfig,
  getStudentWithFormById,
  upsertStudentForm,
} from "@/lib/db";
import { AppError } from "@/lib/errors";
import { handleRouteError, ok } from "@/lib/http";
import { buildRegistrationSubmissionSchema, extractSystemFormValues } from "@/lib/registration-form";
import { requireAdmin } from "@/lib/server-auth";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/admin/students/[id]">,
) {
  try {
    await requireAdmin();
    const { id } = await context.params;

    const student = await getStudentWithFormById(id);

    if (!student) {
      throw new AppError("Student not found.", 404);
    }

    return ok({ student });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/admin/students/[id]">,
) {
  try {
    const session = await requireAdmin();
    const { id } = await context.params;
    const config = await getActiveRegistrationFormConfig();
    const payload = buildRegistrationSubmissionSchema(config).parse(await request.json());

    const student = await getStudentWithFormById(id);

    if (!student) {
      throw new AppError("Student not found.", 404);
    }

    const formData = Object.fromEntries(
      config.map((field) => [field.key, String(payload[field.key] ?? "")]),
    );
    const systemValues = extractSystemFormValues(formData);

    const form = await upsertStudentForm(student.id, {
      ...systemValues,
      formData,
    });

    await createAuditLog({
      adminId: session.user.id,
      action: "UPDATE_STUDENT_FORM",
      targetId: student.id,
      note: `Updated registration form for DD number ${student.ddNumber}`,
    });

    return ok({
      success: true,
      student: {
        ...student,
        form,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
