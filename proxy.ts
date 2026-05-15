import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAdminSessionFromRequest, getStudentSessionFromRequest } from "@/lib/session";

function redirect(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

export default async function proxy(request: NextRequest) {
  const adminSession = getAdminSessionFromRequest(request);
  const studentSession = getStudentSessionFromRequest(request);
  const pathname = request.nextUrl.pathname;

  if (pathname === "/student/login" && studentSession) {
    return redirect(request, "/student/status");
  }

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (!adminSession) {
      return redirect(request, "/admin/login");
    }
  }

  if (pathname === "/student/form") {
    if (!studentSession) {
      return redirect(request, "/student/login");
    }
  }

  if (pathname === "/student/status") {
    if (!studentSession) {
      return redirect(request, "/student/login");
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/student/login", "/student/status", "/student/form"],
};
