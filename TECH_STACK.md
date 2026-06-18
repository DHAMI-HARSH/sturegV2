# Technology Stack

This document outlines all the technologies and tools used in the Stureg (Student Registration) Portal project.

## Frontend

### Core Framework
- **[Next.js](https://nextjs.org/)** (v16.2.4) - React meta-framework for production-grade web applications with built-in SSR, static generation, and API routes
- **[React](https://react.dev/)** (v19.2.4) - JavaScript library for building user interfaces with reusable components
- **[TypeScript](https://www.typescriptlang.org/)** (v5) - Typed superset of JavaScript for better code quality and developer experience
- **[React DOM](https://react.dev/reference/react-dom)** (v19.2.4) - React package for DOM manipulation and rendering

### Styling & UI
- **[Tailwind CSS](https://tailwindcss.com/)** (v4) - Utility-first CSS framework for rapid UI development
- **[Lucide React](https://lucide.dev/)** (v1.11.0) - Beautiful, consistent icon library for React
- **[Sonner](https://sonner.emilkowal.ski/)** (v2.0.7) - Lightweight toast notification library

### Form Handling & Validation
- **[React Hook Form](https://react-hook-form.com/)** (v7.74.0) - Performant, flexible form validation library
- **[Zod](https://zod.dev/)** (v4.3.6) - TypeScript-first schema validation with static type inference
- **[@hookform/resolvers](https://github.com/react-hook-form/resolvers)** (v5.2.2) - Resolver adapters for React Hook Form

### UI Components
- Custom component library built with React and Tailwind CSS
  - Badge
  - Button
  - Input
  - Modal
  - Skeleton (loading placeholder)

## Backend

### Server Framework
- **[Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)** - Serverless API endpoint handling using file-based routing

### Authentication & Sessions
- **[NextAuth](https://next-auth.js.org/)** - Authentication library for NextAuth.js applications
- **[bcryptjs](https://github.com/dcodeIO/bcrypt.js)** (v3.0.3) - Password hashing for secure credential storage
- Session management via cookies and JWT tokens

### Database
- **[Supabase](https://supabase.com/)** - Open-source Firebase alternative
  - PostgreSQL database for structured data storage
  - Real-time subscriptions capability
  - User authentication integration
  - Row-Level Security (RLS) for data privacy

## External Services & APIs

### Image Management
- **[Cloudinary](https://cloudinary.com/)** - Cloud-based image and video management platform
  - Receipt upload and storage
  - Image optimization and transformation
  - Version control for uploaded files
- **[Sharp](https://sharp.pixelplumbing.com/)** (v0.34.5) - High-performance image processing library

### Email Service
- **[Resend](https://resend.com/)** (v6.12.2) - Transactional email API for sending notifications and alerts

### Caching & Rate Limiting
- **[Upstash Redis](https://upstash.com/)** - Serverless Redis database
  - Login rate limiting via [@upstash/ratelimit](https://github.com/upstash/ratelimit-js) (v2.0.8)
  - Session caching
  - Redis client via [@upstash/redis](https://github.com/upstash/redis-js) (v1.37.0)

### OCR & Document Processing
- **[Tesseract.js](https://tesseract.projectnaptha.com/)** (v7.0.0) - JavaScript OCR library for receipt text extraction
- **[json2csv](https://github.com/zemirco/json2csv)** (v6.0.0-alpha.2) - Convert JSON data to CSV format for reports and exports

## Development & Build Tools

### Linting & Code Quality
- **[ESLint](https://eslint.org/)** (v9) - JavaScript/TypeScript linter for code quality
- **eslint-config-next** (v16.2.4) - Next.js recommended ESLint configuration

### Build & Runtime
- **[tsx](https://tsx.is/)** (v4.20.6) - TypeScript execution and file watching for Node.js scripts
- **[PostCSS](https://postcss.org/)** - CSS transformer with Tailwind CSS integration
  - [@tailwindcss/postcss](https://tailwindcss.com/) (v4)

### Utilities
- **[dotenv](https://github.com/motdotla/dotenv)** (v17.2.3) - Environment variable management
- **[file-type](https://github.com/sindresorhus/file-type)** (v22.0.1) - Detect file types by checking magic numbers
- **[chrono-node](https://github.com/wanasit/chrono)** (v2.9.0) - Natural language date parsing

## Type Definitions
- **[@types/node](https://www.npmjs.com/package/@types/node)** (v20) - TypeScript definitions for Node.js
- **[@types/react](https://www.npmjs.com/package/@types/react)** (v19) - TypeScript definitions for React
- **[@types/react-dom](https://www.npmjs.com/package/@types/react-dom)** (v19) - TypeScript definitions for React DOM

## Architecture Overview

### Folder Structure
```
stureg/
├── app/                    # Next.js App Router pages and layouts
│   ├── admin/             # Admin dashboard routes
│   ├── api/               # API routes
│   ├── student/           # Student portal routes
│   └── auth/              # Authentication routes
├── components/            # Reusable React components
│   ├── admin/            # Admin-specific components
│   ├── student/          # Student-specific components
│   └── ui/               # Shared UI components
├── lib/                   # Utility functions and services
│   ├── db.ts            # Database queries
│   ├── server-auth.ts   # Authentication utilities
│   ├── mailer.ts        # Email sending
│   ├── ocr.ts           # OCR processing
│   ├── cloudinary.ts    # Image handling
│   └── ...
└── public/               # Static assets
```

### Key Features
- **Student Portal**: Registration forms, status tracking, password management
- **Admin Dashboard**: Account management, request approval/rejection, reports, semester configuration, form management
- **Receipt Processing**: OCR-based receipt scanning and validation
- **Rate Limiting**: Login attempt throttling with Redis
- **Email Notifications**: Transactional emails via Resend
- **CSV Export**: Report generation and data export

## Environment Configuration

The project uses environment variables for external service credentials. See `.env.example` for required variables:

- Supabase credentials
- NextAuth configuration
- Cloudinary API keys
- Upstash Redis connection
- Resend API key
- Email configuration
- Timezone settings

## Deployment

- **Hosting**: Optimized for [Vercel](https://vercel.com/)
- **Database**: Supabase (managed PostgreSQL)
- **Serverless Functions**: Next.js API Routes on Vercel
- **Static Assets**: Cloudinary (images), Vercel (other static files)

## Development Scripts

```bash
npm run dev           # Start development server
npm run build         # Build for production
npm start             # Start production server
npm run lint          # Run ESLint
npm run db:seed       # Seed database with initial data
```

## Security Considerations

- Password hashing with bcryptjs
- Rate limiting on authentication endpoints
- Environment variable isolation
- Row-Level Security (RLS) on Supabase database
- HTTP-only session cookies
- CSRF protection via NextAuth

---

**Last Updated**: May 2026  
**Next.js Version**: 16.2.4  
**React Version**: 19.2.4  
**Node.js TypeScript Version**: 5
