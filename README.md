# Stureg

**Stureg** (Student Registration) is a web portal for college student intake and admin review. Students upload semester fee receipts, track approval status, and complete registration forms. Admins manage accounts, review submissions, configure semesters and forms, and export data.

Built with [Next.js](https://nextjs.org/) 16 (App Router), React 19, TypeScript, and Supabase.

## Features

### Student portal

- Login with DD number and password (accounts created by admin)
- Upload semester fee receipts (JPG, PNG, or PDF)
- Automatic receipt validation via local OCR (date checked against the active semester window)
- Track approval status (pending, approved, rejected)
- Complete the registration form after approval
- Change password on first login when required

### Admin dashboard

- Secure admin login with rate limiting
- Create student accounts and reset passwords
- Review, approve, or reject receipt submissions
- Configure semester date windows
- Customize the live student registration form (form editor)
- Export approved student forms as CSV
- Audit-friendly workflow for registration intake

## Tech stack

| Layer | Technologies |
| --- | --- |
| Frontend | Next.js, React, TypeScript, Tailwind CSS, React Hook Form, Zod |
| Backend | Next.js API Routes, custom signed session cookies |
| Database | Supabase (PostgreSQL) |
| Storage | Cloudinary (receipt images) |
| Email | Resend |
| Caching / rate limits | Upstash Redis |
| OCR | Tesseract.js (runs locally, no external OCR API) |

For a full dependency list and architecture notes, see [TECH_STACK.md](./TECH_STACK.md).

## Prerequisites

Before running the app locally, set up accounts for:

- [Supabase](https://supabase.com/) — PostgreSQL database
- [Cloudinary](https://cloudinary.com/) — receipt image storage
- [Upstash](https://upstash.com/) — Redis for login rate limiting
- [Resend](https://resend.com/) — transactional email

**Node.js** 20+ and **npm** are recommended.

## Quick start

### 1. Clone and install

```bash
git clone <your-repo-url>
cd stureg
npm install
```

### 2. Environment variables

Copy the example file and fill in your credentials:

```bash
cp .env.example .env.local
```

Required variables (see [`.env.example`](./.env.example)):

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key |
| `SUPABASE_URL` | Same Supabase URL (server-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server routes only) |
| `SESSION_SECRET` | Random secret, 32+ characters (session signing) |
| `CLOUDINARY_*` | Cloud name, API key, and API secret |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |
| `RESEND_API_KEY` | Resend API key |
| `MAIL_FROM` | Verified sender email (must be a real address) |
| `ADMIN_SEED_EMAIL` | Initial admin email for seeding |
| `ADMIN_SEED_PASSWORD` | Initial admin password for seeding |
| `APP_TIMEZONE` | e.g. `Asia/Calcutta` |
| `ALLOW_PLAINTEXT_DEV_PASSWORDS` | `false` in production |

`SESSION_SECRET` may also be set as `NEXTAUTH_SECRET` for compatibility. `SUPABASE_URL` falls back to `NEXT_PUBLIC_SUPABASE_URL` if omitted.

### 3. Database schema

In the Supabase SQL editor, run the schema from:

```
supabase/schema.sql
```

This creates tables for admins, students, forms, semester config, registration form config, and audit logs.

### 4. Seed initial data

```bash
npm run db:seed
```

This creates the initial admin account and a default active semester window. Seed scripts are kept out of version control; see [BACKEND_SETUP.md](./BACKEND_SETUP.md) if you need to recreate them locally.

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- **Student portal:** `/student/login`
- **Admin portal:** `/admin/login`

## Recommended first test

1. Start the dev server (`npm run dev`).
2. Sign in at `/admin/login` with your seed admin credentials.
3. Create a student account from the admin dashboard.
4. Log in as that student and upload a receipt (JPG, PNG, or PDF).
5. Approve the request in the admin dashboard.
6. Complete the student registration form.

More troubleshooting and backend flow details are in [BACKEND_SETUP.md](./BACKEND_SETUP.md).

## Project structure

```
stureg/
├── app/                 # Pages, layouts, and API routes
│   ├── admin/           # Admin dashboard and login
│   ├── student/         # Student portal pages
│   └── api/             # REST API handlers
├── components/          # React components (admin, student, ui)
├── lib/                 # Auth, DB, OCR, mail, Cloudinary, validators
├── public/              # Static assets
└── supabase/            # SQL schema
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:seed` | Seed admin account and default semester config |

## Deployment

The app is optimized for [Vercel](https://vercel.com/). Set the same environment variables from `.env.example` in your Vercel project settings. Do not commit secrets to the repository.

- **Hosting:** Vercel (Next.js)
- **Database:** Supabase
- **Images:** Cloudinary
- **Email:** Resend

## Security

- Never commit `.env.local` or real API keys.
- Rotate credentials if they were ever exposed in Git or logs.
- Passwords are hashed with bcrypt; sessions use signed HTTP-only cookies.
- Login endpoints are rate-limited via Upstash Redis.
- Use `ALLOW_PLAINTEXT_DEV_PASSWORDS=false` in production.
- Keep seed scripts and database dumps out of Git for production deployments.

## Documentation

- [BACKEND_SETUP.md](./BACKEND_SETUP.md) — detailed backend setup, API flows, and troubleshooting
- [TECH_STACK.md](./TECH_STACK.md) — full technology stack and architecture overview

## License

Private project — see repository owner for usage terms.
