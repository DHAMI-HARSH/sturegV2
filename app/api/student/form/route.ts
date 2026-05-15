import {
  createStudentForm,
  getActiveRegistrationFormConfig,
  getStudentWithFormByDdNumber,
} from "@/lib/db";
import { handleRouteError, created, ok } from "@/lib/http";
import { extractSystemFormValues, buildRegistrationSubmissionSchema } from "@/lib/registration-form";
import { requireApprovedStudent } from "@/lib/server-auth";
import { AppError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await requireApprovedStudent();
    const ddNumber = session.user.ddNumber;

    if (!ddNumber) {
      throw new AppError("Student session is missing a DD number.", 401);
    }

    const student = await getStudentWithFormByDdNumber(ddNumber);

    if (!student) {
      throw new AppError("Student not found.", 404);
    }

    const config = await getActiveRegistrationFormConfig();

    return ok({
      student: {
        fullName: student.studentName,
        ddNumber: student.ddNumber,
        email: student.email,
        status: student.status,
      },
      form: student.form,
      config,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApprovedStudent();
    const config = await getActiveRegistrationFormConfig();
    const payload = buildRegistrationSubmissionSchema(config).parse(await request.json());
    const ddNumber = session.user.ddNumber;

    if (!ddNumber) {
      throw new AppError("Student session is missing a DD number.", 401);
    }

    const student = await getStudentWithFormByDdNumber(ddNumber);

    if (!student) {
      throw new AppError("Student not found.", 404);
    }

    if (student.form) {
      throw new AppError("Registration form has already been submitted.", 409);
    }

    const formData = Object.fromEntries(
      config.map((field) => [field.key, String(payload[field.key] ?? "")]),
    );
    const systemValues = extractSystemFormValues(formData);

    const form = await createStudentForm(student.id, { ...systemValues, formData });

    return created({ success: true, form });
  } catch (error) {
    return handleRouteError(error);
  }
}
