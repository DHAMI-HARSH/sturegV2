import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";

type AuthRequestOptions = {
  method?: "GET" | "POST" | "PUT";
  body?: unknown;
  useServiceRole?: boolean;
};

type SupabaseAuthErrorPayload = {
  msg?: string;
  message?: string;
  error?: string;
  error_code?: string;
  error_description?: string;
};

type SupabasePasswordSignInResponse = {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email?: string;
  };
};

type SupabaseAuthUser = {
  id: string;
  email?: string;
  app_metadata?: {
    role?: string;
  };
};

type SupabaseListUsersResponse = {
  users?: SupabaseAuthUser[];
};

function ensureServiceRoleKey() {
  if (
    env.SUPABASE_SERVICE_ROLE_KEY === env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_SERVICE_ROLE_KEY.startsWith("sb_publishable_")
  ) {
    throw new AppError(
      "SUPABASE_SERVICE_ROLE_KEY is using a publishable key. Replace it with the real service role key from Supabase Settings > API.",
      500,
    );
  }
}

function toAuthError(status: number, payload: SupabaseAuthErrorPayload | null, useServiceRole: boolean) {
  const message =
    payload?.error_description ??
    payload?.msg ??
    payload?.message ??
    payload?.error ??
    "Supabase Auth request failed.";

  const errorCode = payload?.error_code ?? payload?.error;

  if (!useServiceRole && (status === 400 || status === 401)) {
    if (errorCode === "invalid_credentials" || message.toLowerCase().includes("invalid login credentials")) {
      return new AppError("Invalid admin email or password.", 401);
    }

    return new AppError(message, 401);
  }

  if (status === 401 || status === 403) {
    return new AppError(
      `Supabase Auth rejected the server credentials. ${message}`,
      500,
    );
  }

  if (status === 422 || status === 400) {
    return new AppError(message, 400);
  }

  return new AppError(message, 500);
}

async function supabaseAuthRequest<T>(path: string, options: AuthRequestOptions = {}) {
  const useServiceRole = options.useServiceRole ?? false;

  if (useServiceRole) {
    ensureServiceRoleKey();
  }

  const apiKey = useServiceRole
    ? env.SUPABASE_SERVICE_ROLE_KEY
    : env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const response = await fetch(new URL(`/auth/v1/${path}`, env.SUPABASE_URL), {
    method: options.method ?? "GET",
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as T | SupabaseAuthErrorPayload | null;

  if (!response.ok) {
    throw toAuthError(response.status, payload as SupabaseAuthErrorPayload | null, useServiceRole);
  }

  return payload as T;
}

export async function signInAdminWithSupabase(email: string, password: string) {
  return supabaseAuthRequest<SupabasePasswordSignInResponse>("token?grant_type=password", {
    method: "POST",
    body: { email, password },
  });
}

async function findAuthUserByEmail(email: string) {
  const payload = await supabaseAuthRequest<SupabaseListUsersResponse>("admin/users", {
    useServiceRole: true,
  });

  return payload.users?.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function ensureAdminSupabaseUser(email: string, password: string) {
  const existingUser = await findAuthUserByEmail(email);

  if (!existingUser) {
    await supabaseAuthRequest("admin/users", {
      method: "POST",
      useServiceRole: true,
      body: {
        email,
        password,
        email_confirm: true,
        app_metadata: {
          role: "admin",
        },
      },
    });
    return;
  }

  await supabaseAuthRequest(`admin/users/${existingUser.id}`, {
    method: "PUT",
    useServiceRole: true,
    body: {
      password,
      email_confirm: true,
      app_metadata: {
        ...(existingUser.app_metadata ?? {}),
        role: "admin",
      },
    },
  });
}
