# Backend Setup

This project now uses:

- Supabase for the database
- NextAuth for admin/student sessions
- Cloudinary for receipt uploads
- Upstash Redis for login rate limiting
- Resend for transactional email

There is no Prisma in the project anymore.

## 1. Required services

Before starting, create or collect credentials for:

- Supabase project
- Cloudinary account
- Upstash Redis database
- Resend account

## 2. Environment variables

Copy the values into `.env.local`.

Required variables:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

NEXTAUTH_SECRET=your-long-random-secret
NEXTAUTH_URL=http://localhost:3000

CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

UPSTASH_REDIS_REST_URL=https://your-upstash-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token

RESEND_API_KEY=your-resend-api-key
MAIL_FROM=noreply@yourdomain.com

ADMIN_SEED_EMAIL=admin@college.edu
ADMIN_SEED_PASSWORD=Admin@12345

APP_TIMEZONE=Asia/Calcutta
```

Notes:

- `MAIL_FROM` must be a real email address. It cannot be an API key.
- `SUPABASE_SERVICE_ROLE_KEY` is required because the backend talks directly to Supabase REST from server routes.
- `NEXTAUTH_SECRET` should be a strong random string, ideally 32+ characters.
- OCR runs locally with `tesseract.js`, so there is no extra OCR API key or billing setup required.

## 3. Supabase database setup

Open your Supabase project and go to the SQL editor.

Run the SQL from:

- [supabase/schema.sql](/d:/codinggg/Stureg/stureg/supabase/schema.sql:1)

This creates:

- `admins`
- `students`
- `student_forms`
- `registration_form_configs`
- `semester_configs`
- `audit_logs`
- `fee_receipts`

It also creates the indexes needed by the current backend.

## 4. Install project dependencies

Run:

```bash
npm install
```

This installs the local OCR dependency set used by the app.

## 5. Seed the backend

After the schema exists and `.env.local` is filled, run:

```bash
npm run db:seed
```

This seed script:

- creates or updates the initial admin account
- creates a default active semester window if none exists

Seed entrypoint:

- [scripts/seed.ts](/d:/codinggg/Stureg/stureg/scripts/seed.ts:1)

Seed logic:

- [lib/db-seed.ts](/d:/codinggg/Stureg/stureg/lib/db-seed.ts:1)

## 6. Start the app

Run:

```bash
npm run dev
```

Local URL:

```txt
http://localhost:3000
```

## 7. Backend architecture

Main backend files:

- Env validation: [lib/env.ts](/d:/codinggg/Stureg/stureg/lib/env.ts:1)
- Supabase REST client: [lib/supabase-rest.ts](/d:/codinggg/Stureg/stureg/lib/supabase-rest.ts:1)
- Database access layer: [lib/db.ts](/d:/codinggg/Stureg/stureg/lib/db.ts:1)
- Session/auth config: [lib/auth.ts](/d:/codinggg/Stureg/stureg/lib/auth.ts:1)
- Route protection: [lib/server-auth.ts](/d:/codinggg/Stureg/stureg/lib/server-auth.ts:1)
- Request proxy rules: [proxy.ts](/d:/codinggg/Stureg/stureg/proxy.ts:1)

Supporting services:

- OCR/date extraction: [lib/ocr.ts](/d:/codinggg/Stureg/stureg/lib/ocr.ts:1)
- Receipt upload: [lib/cloudinary.ts](/d:/codinggg/Stureg/stureg/lib/cloudinary.ts:1)
- Email delivery: [lib/mailer.ts](/d:/codinggg/Stureg/stureg/lib/mailer.ts:1)
- Rate limiting: [lib/ratelimit.ts](/d:/codinggg/Stureg/stureg/lib/ratelimit.ts:1)

## 8. Main backend flows

### Admin flow

Admin can:

- sign in
- create student accounts
- reset student passwords
- review receipt submissions
- approve or reject students
- configure semester date window
- change the live student registration form fields
- export approved student forms as CSV

Key admin routes:

- [app/api/auth/admin/login/route.ts](/d:/codinggg/Stureg/stureg/app/api/auth/admin/login/route.ts:1)
- [app/api/admin/accounts/route.ts](/d:/codinggg/Stureg/stureg/app/api/admin/accounts/route.ts:1)
- [app/api/admin/accounts/[id]/reset-password/route.ts](/d:/codinggg/Stureg/stureg/app/api/admin/accounts/[id]/reset-password/route.ts:1)
- [app/api/admin/requests/route.ts](/d:/codinggg/Stureg/stureg/app/api/admin/requests/route.ts:1)
- [app/api/admin/requests/[id]/approve/route.ts](/d:/codinggg/Stureg/stureg/app/api/admin/requests/[id]/approve/route.ts:1)
- [app/api/admin/requests/[id]/reject/route.ts](/d:/codinggg/Stureg/stureg/app/api/admin/requests/[id]/reject/route.ts:1)
- [app/api/admin/semester-config/route.ts](/d:/codinggg/Stureg/stureg/app/api/admin/semester-config/route.ts:1)
- [app/api/admin/registration-form-config/route.ts](/d:/codinggg/Stureg/stureg/app/api/admin/registration-form-config/route.ts:1)
- [app/api/admin/export/csv/route.ts](/d:/codinggg/Stureg/stureg/app/api/admin/export/csv/route.ts:1)

### Student flow

Student flow is:

1. Admin creates student account
2. Student logs in with DD number and password
3. Student uploads current semester receipt
4. Receipt is uploaded to Cloudinary
5. Local OCR extracts text and a date from the receipt
6. Date is checked against active semester window
7. Admin approves the student
8. Student completes final registration form

Key student routes:

- [app/api/auth/student/login/route.ts](/d:/codinggg/Stureg/stureg/app/api/auth/student/login/route.ts:1)
- [app/api/student/status/route.ts](/d:/codinggg/Stureg/stureg/app/api/student/status/route.ts:1)
- [app/api/student/form/route.ts](/d:/codinggg/Stureg/stureg/app/api/student/form/route.ts:1)
- [app/api/student/change-password/route.ts](/d:/codinggg/Stureg/stureg/app/api/student/change-password/route.ts:1)

## 9. Recommended first test

After setup, test in this order:

1. Run `npm run dev`
2. Open `/admin/login`
3. Log in with `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD`
4. Create one student account
5. Log in as that student
6. Upload a JPG, PNG, or PDF receipt
7. Return to admin and approve the request
8. Complete the student form

## 10. Common issues

### Build fails because of env validation

Check:

- `MAIL_FROM` is a valid email
- `SUPABASE_URL` is a full URL
- `SUPABASE_SERVICE_ROLE_KEY` is present

Validation file:

- [lib/env.ts](/d:/codinggg/Stureg/stureg/lib/env.ts:1)

### Student login works but receipt validation fails

Check:

- Cloudinary credentials
- uploaded file is JPG, PNG, or PDF
- active semester window exists
- OCR can read a visible receipt date

Relevant files:

- [lib/cloudinary.ts](/d:/codinggg/Stureg/stureg/lib/cloudinary.ts:1)
- [lib/ocr.ts](/d:/codinggg/Stureg/stureg/lib/ocr.ts:1)
- [app/api/auth/student/login/route.ts](/d:/codinggg/Stureg/stureg/app/api/auth/student/login/route.ts:1)

### Seed runs but admin login fails

Check:

- schema was executed in Supabase first
- `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD` are what you expect
- `npm run db:seed` completed successfully

### Requests fail with database errors

Check:

- `SUPABASE_SERVICE_ROLE_KEY` belongs to the same project as `SUPABASE_URL`
- tables from `supabase/schema.sql` exist
- column names were not manually changed in Supabase

## 11. Commands summary

```bash
npm install
npm run db:seed
npm run dev
```
