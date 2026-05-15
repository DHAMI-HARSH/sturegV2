import { clearSessionFromResponse } from "@/lib/session";
import { ok } from "@/lib/http";

export async function POST() {
  return clearSessionFromResponse(
    ok({
      success: true,
      message: "Student session cleared.",
    }),
  );
}
