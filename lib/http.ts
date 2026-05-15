import { ZodError } from "zod";
import { AppError, getErrorMessage } from "@/lib/errors";

function normalizeUnknownErrorMessage(message: string) {
  const lowered = message.toLowerCase();

  if (lowered.includes("invalid api key")) {
    return "A third-party service rejected the API key. Check your Cloudinary, Supabase, and Resend keys in .env.local.";
  }

  if (lowered.includes("invalid login credentials")) {
    return "Invalid login credentials.";
  }

  return message;
}

export function ok(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

export function created(data: unknown) {
  return Response.json(data, { status: 201 });
}

export function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    return Response.json(
      {
        error: "Validation failed",
        details: error.flatten(),
      },
      { status: 400 },
    );
  }

  if (error instanceof AppError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  console.error(error);
  return Response.json({ error: normalizeUnknownErrorMessage(getErrorMessage(error)) }, { status: 500 });
}
