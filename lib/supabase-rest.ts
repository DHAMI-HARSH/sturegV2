import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH";
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  prefer?: string[];
};

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const url = new URL(`/rest/v1/${path}`, env.SUPABASE_URL);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

function toAppError(status: number, payload: unknown) {
  const message =
    payload &&
    typeof payload === "object" &&
    (("message" in payload && typeof payload.message === "string" && payload.message) ||
      ("error_description" in payload &&
        typeof payload.error_description === "string" &&
        payload.error_description) ||
      ("hint" in payload && typeof payload.hint === "string" && payload.hint))
      ? (("message" in payload && typeof payload.message === "string" && payload.message) ||
          ("error_description" in payload &&
            typeof payload.error_description === "string" &&
            payload.error_description) ||
          ("hint" in payload && typeof payload.hint === "string" && payload.hint) ||
          "Database request failed.")
      : "Database request failed.";

  const code =
    payload && typeof payload === "object" && "code" in payload && typeof payload.code === "string"
      ? payload.code
      : undefined;

  if (status === 404) {
    return new AppError(message, 404);
  }

  if (status === 409 || code === "23505") {
    return new AppError(message, 409);
  }

  if (status === 400) {
    return new AppError(message, 400);
  }

  return new AppError(message, 500);
}

export async function supabaseRequest<T>(path: string, options: RequestOptions = {}) {
  if (
    env.SUPABASE_SERVICE_ROLE_KEY === env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_SERVICE_ROLE_KEY.startsWith("sb_publishable_")
  ) {
    throw new AppError(
      "SUPABASE_SERVICE_ROLE_KEY is set to a publishable key. Replace it with the real service role key from Supabase Settings > API.",
      500,
    );
  }

  const headers = new Headers({
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  });

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (options.prefer?.length) {
    headers.set("Prefer", options.prefer.join(","));
  }

  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (response.status === 204) {
    return null as T;
  }

  const payload = (await response.json().catch(() => null)) as T;

  if (!response.ok) {
    throw toAppError(response.status, payload);
  }

  return payload;
}
