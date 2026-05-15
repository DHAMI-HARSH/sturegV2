import { Parser } from "json2csv";
import { getActiveRegistrationFormConfig, listApprovedStudentsWithForms } from "@/lib/db";
import { handleRouteError } from "@/lib/http";
import { requireAdmin } from "@/lib/server-auth";

export async function GET() {
  try {
    await requireAdmin();
    const students = await listApprovedStudentsWithForms();
    const fields = await getActiveRegistrationFormConfig();

    const rows = students.map((student) => ({
      ddNumber: student.ddNumber,
      approvedAt: student.approvedAt?.toISOString() ?? "",
      submittedAt: student.form?.submittedAt.toISOString() ?? "",
      ...Object.fromEntries(
        fields
          .filter((field) => field.enabled)
          .map((field) => [field.label, student.form?.formData[field.key] ?? ""]),
      ),
    }));

    const parser = new Parser();
    const csv = parser.parse(rows);

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="student-registrations.csv"',
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
