import { listApprovedStudentsWithForms } from "@/lib/db";
import { handleRouteError, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/server-auth";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim();
    const branch = searchParams.get("branch")?.trim();
    const semester = searchParams.get("semester");

    const students = await listApprovedStudentsWithForms({ query, branch, semester });

    return ok({ students });
  } catch (error) {
    return handleRouteError(error);
  }
}
