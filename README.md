This is a [Next.js](https://nextjs.org) project for a student registration portal with Supabase, Cloudinary, Upstash, and Resend integrations.

## Getting Started

1. Copy `.env.example` to `.env.local`.
2. Fill in your real credentials locally.
3. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Security Notes

- Never commit `.env.local` or any real API keys.
- Keep seed scripts and database dump files out of Git for production-facing deployments.
- If any real credentials were previously committed, rotate them in Supabase, Cloudinary, Upstash, and Resend.

## Deploy on Vercel

Set the same variables from `.env.example` in your Vercel project settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SESSION_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `RESEND_API_KEY`
- `MAIL_FROM`
- `ADMIN_SEED_EMAIL`
- `ADMIN_SEED_PASSWORD`
- `APP_TIMEZONE`
- `ALLOW_PLAINTEXT_DEV_PASSWORDS`

Do not store these values in the repo. Configure them only in Vercel environment variables and your local `.env.local`.
