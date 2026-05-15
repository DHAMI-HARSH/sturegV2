import { getActiveSemesterConfig, setActiveSemesterConfig } from "@/lib/db";
import { handleRouteError, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/server-auth";
import { semesterConfigSchema } from "@/lib/validators";

export async function GET() {
  try {
    await requireAdmin();
    const config = await getActiveSemesterConfig();

    return ok({ config });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const payload = semesterConfigSchema.parse(await request.json());

    const config = await setActiveSemesterConfig({
      label: payload.label,
      startDate: new Date(payload.startDate),
      endDate: new Date(payload.endDate),
    });

    return ok({ success: true, config });
  } catch (error) {
    return handleRouteError(error);
  }
}
