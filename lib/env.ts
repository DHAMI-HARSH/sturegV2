import { z } from "zod";

const runtimeEnv = {
  ...process.env,
  SUPABASE_URL: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET ?? process.env.NEXTAUTH_SECRET,
};

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  MAIL_FROM: z.string().email(),
  ADMIN_SEED_EMAIL: z.string().email().default("admin@college.edu"),
  ADMIN_SEED_PASSWORD: z.string().min(8).default("Admin@12345"),
  APP_TIMEZONE: z.string().min(1).default("Asia/Calcutta"),
  ALLOW_PLAINTEXT_DEV_PASSWORDS: z.enum(["true", "false"]).optional(),
});

const parsed = envSchema.safeParse(runtimeEnv);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  throw new Error(`Invalid environment variables:\n${issues}`);
}

export const env = parsed.data;
