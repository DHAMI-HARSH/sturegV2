import { getAdminByEmail } from "@/lib/db";
import { handleRouteError, ok } from "@/lib/http";
import { verifyPassword } from "@/lib/password";
import { applySessionToResponse } from "@/lib/session";
import { ensureAdminSupabaseUser, signInAdminWithSupabase } from "@/lib/supabase-auth";
import { adminLoginSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const payload = adminLoginSchema.parse(await request.json());
    const admin = await getAdminByEmail(payload.email);

    if (!admin) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    try {
      await signInAdminWithSupabase(payload.email, payload.password);
    } catch {
      const valid = await verifyPassword(payload.password, admin.password);
      if (!valid) {
        return Response.json({ error: "Invalid credentials" }, { status: 401 });
      }

      await ensureAdminSupabaseUser(payload.email, payload.password);
      await signInAdminWithSupabase(payload.email, payload.password);
    }

    return applySessionToResponse(
      ok({
        success: true,
        message: "Admin login successful.",
      }),
      {
        role: "admin",
        adminId: admin.id,
        email: admin.email,
      },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
