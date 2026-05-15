import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { env } from "@/lib/env";

const LEGACY_SESSION_COOKIE_NAME = "stureg_session";
const ADMIN_SESSION_COOKIE_NAME = "stureg_admin_session";
const STUDENT_SESSION_COOKIE_NAME = "stureg_student_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

type SessionEnvelope = {
  exp: number;
  payload: SessionPayload;
};

export type SessionPayload =
  | {
      role: "admin";
      adminId: string;
      email: string;
    }
  | {
      role: "student";
      studentId?: string;
      ddNumber: string;
    };

type SessionCookieOptions = {
  maxAge: number;
};

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return createHmac("sha256", env.SESSION_SECRET).update(value).digest("base64url");
}

function getCookieNameForPayload(payload: SessionPayload) {
  return payload.role === "admin" ? ADMIN_SESSION_COOKIE_NAME : STUDENT_SESSION_COOKIE_NAME;
}

function buildSessionCookie(name: string, value: string, options: SessionCookieOptions) {
  const parts = [
    `${name}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${options.maxAge}`,
  ];

  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function encodeSessionToken(payload: SessionPayload) {
  const envelope: SessionEnvelope = {
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    payload,
  };
  const encoded = base64UrlEncode(JSON.stringify(envelope));
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function decodeSessionToken(token?: string | null): SessionPayload | null {
  if (!token) {
    return null;
  }

  const [encoded, providedSignature] = token.split(".");
  if (!encoded || !providedSignature) {
    return null;
  }

  const expectedSignature = sign(encoded);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const envelope = JSON.parse(base64UrlDecode(encoded)) as SessionEnvelope;
    if (!envelope?.payload || typeof envelope.exp !== "number" || envelope.exp < Date.now()) {
      return null;
    }

    return envelope.payload;
  } catch {
    return null;
  }
}

export async function createSession(payload: SessionPayload) {
  const store = await cookies();
  store.set(getCookieNameForPayload(payload), encodeSessionToken(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function applySessionToResponse(response: Response, payload: SessionPayload) {
  response.headers.append(
    "Set-Cookie",
    buildSessionCookie(getCookieNameForPayload(payload), encodeSessionToken(payload), {
      maxAge: SESSION_MAX_AGE_SECONDS,
    }),
  );
  response.headers.append(
    "Set-Cookie",
    buildSessionCookie(LEGACY_SESSION_COOKIE_NAME, "", { maxAge: 0 }),
  );

  return response;
}

export async function clearSession() {
  const store = await cookies();
  for (const name of [LEGACY_SESSION_COOKIE_NAME, ADMIN_SESSION_COOKIE_NAME, STUDENT_SESSION_COOKIE_NAME]) {
    store.set(name, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
  }
}

export function clearSessionFromResponse(response: Response) {
  for (const name of [LEGACY_SESSION_COOKIE_NAME, ADMIN_SESSION_COOKIE_NAME, STUDENT_SESSION_COOKIE_NAME]) {
    response.headers.append("Set-Cookie", buildSessionCookie(name, "", { maxAge: 0 }));
  }
  return response;
}

function decodeRoleSession<T extends SessionPayload["role"]>(
  token: string | null | undefined,
  role: T,
): Extract<SessionPayload, { role: T }> | null {
  const decoded = decodeSessionToken(token);
  return decoded?.role === role ? (decoded as Extract<SessionPayload, { role: T }>) : null;
}

export async function getAdminSession(): Promise<Extract<SessionPayload, { role: "admin" }> | null> {
  const store = await cookies();
  return (
    decodeRoleSession(store.get(ADMIN_SESSION_COOKIE_NAME)?.value, "admin") ??
    decodeRoleSession(store.get(LEGACY_SESSION_COOKIE_NAME)?.value, "admin")
  );
}

export async function getStudentSession(): Promise<Extract<SessionPayload, { role: "student" }> | null> {
  const store = await cookies();
  return (
    decodeRoleSession(store.get(STUDENT_SESSION_COOKIE_NAME)?.value, "student") ??
    decodeRoleSession(store.get(LEGACY_SESSION_COOKIE_NAME)?.value, "student")
  );
}

export async function getSession() {
  return (await getStudentSession()) ?? (await getAdminSession());
}

export function getAdminSessionFromRequest(request: NextRequest) {
  return (
    decodeRoleSession(request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value, "admin") ??
    decodeRoleSession(request.cookies.get(LEGACY_SESSION_COOKIE_NAME)?.value, "admin")
  );
}

export function getStudentSessionFromRequest(request: NextRequest) {
  return (
    decodeRoleSession(request.cookies.get(STUDENT_SESSION_COOKIE_NAME)?.value, "student") ??
    decodeRoleSession(request.cookies.get(LEGACY_SESSION_COOKIE_NAME)?.value, "student")
  );
}

export function getSessionFromRequest(request: NextRequest) {
  return getStudentSessionFromRequest(request) ?? getAdminSessionFromRequest(request);
}
