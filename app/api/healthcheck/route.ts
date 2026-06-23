import { supabaseRequest } from "@/lib/supabase-rest";

export const dynamic = "force-dynamic";

export async function GET() {
  await supabaseRequest("semester_configs", {
    query: {
      select: "id",
      limit: 1,
    },
  });

  return Response.json({
    ok: true,
    checkedAt: new Date().toISOString(),
  });
}
