import { listReviewRequests } from "@/lib/db";
import { handleRouteError, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/server-auth";

export async function GET() {
  try {
    await requireAdmin();
    const requests = await listReviewRequests();

    return ok({ requests });
  } catch (error) {
    return handleRouteError(error);
  }
}
