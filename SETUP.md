# Technical Setup Guide — ANYA SEGEN CRM

**For:** Developers setting up the project
**Last Updated:** May 2026

---

## 1. Prerequisites

Make sure the following are installed on your machine before starting.

| Tool | Minimum Version | Check |
|---|---|---|
| Node.js | 18.x or higher | `node --version` |
| npm | 9.x or higher | `npm --version` |
| Git | Any recent version | `git --version` |

---

## 2. External Services Required

You need accounts on all four services below. All have free tiers that are sufficient for development.

### 2.1 Supabase (Database + Auth)
- Go to [supabase.com](https://supabase.com) → Create a new project
- From **Project Settings → API**, copy:
  - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
  - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
- ⚠️ Never expose `service_role` key in the browser or commit it to git

### 2.2 Resend (Email Sending)
- Go to [resend.com](https://resend.com) → Create account
- From **API Keys**, create a new key → `RESEND_API_KEY`
- Under **Domains**, add and verify your sending domain (e.g. `anyasegen.com`)
- Set `EMAIL_FROM` to your verified sender address (e.g. `noreply@anyasegen.com`)
- ⚠️ If a recipient's email bounces, Resend auto-suppresses it — check the suppression list if emails stop arriving

### 2.3 Google AI — Gemini (Primary AI)
- Go to [aistudio.google.com](https://aistudio.google.com) → Get API Key
- Copy the key → `GOOGLE_API_KEY`
- Model used: **Gemini 2.5 Flash Lite**

### 2.4 Groq (AI Fallback)
- Go to [console.groq.com](https://console.groq.com) → Create API Key
- Copy the key → `GROQ_API_KEY`
- Used automatically if Gemini fails or is unavailable

---

## 3. Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd spaceship-main

# 2. Install dependencies
npm install
```

---

## 4. Environment Variables

Create a `.env.local` file in the project root:

```env
# ── Supabase ──────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# ── AI ────────────────────────────────────────────────────
GOOGLE_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here

# ── Email ─────────────────────────────────────────────────
RESEND_API_KEY=your_resend_api_key_here
EMAIL_FROM=noreply@yourdomain.com

# ── App ───────────────────────────────────────────────────
# Local development:
NEXT_PUBLIC_APP_URL=http://localhost:3000
# Production (update after Vercel deploy):
# NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

> ⚠️ Never commit `.env.local` to git. It is already in `.gitignore`.

---

## 5. Database Setup

The project uses Supabase (PostgreSQL). All tables must exist before running the app.

### Key Tables

| Table | Purpose |
|---|---|
| `profiles` | Extends Supabase auth users — stores `role`, `department_id`, `first_name`, `last_name` |
| `departments` | Organisation units — referenced by profiles and documents |
| `documents` | Knowledge base articles — scoped by `department_id`, gated by `is_published` |
| `admin_tasks` | Kanban board tasks — `assigned_to` is a user UUID |
| `admin_events` | Calendar events — `assigned_to` is `text` (stores JSON array of user IDs) |
| `clients` | Agency clients — can be shared with specific users |
| `content_posts` | Social media drafts — status workflow and scheduling |

### Required SQL Fix (admin_events)

If setting up from scratch, run this in the Supabase SQL Editor to allow multiple assignees on calendar events:

```sql
ALTER TABLE admin_events DROP CONSTRAINT admin_events_assigned_to_fkey;
ALTER TABLE admin_events ALTER COLUMN assigned_to TYPE text;
```

---

## 6. Running Locally

```bash
# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

- Admin dashboard: log in with an account that has `role = 'admin'` in `profiles`
- User dashboard: log in with an account that has `role = 'user'` in `profiles`

---

## 7. Available Scripts

```bash
npm run dev      # Start dev server (hot reload) on port 3000
npm run build    # Build for production
npm run start    # Start production server (run build first)
npm run lint     # Run ESLint checks
```

---

## 8. Project Structure (Key Files)

```
src/
├── app/
│   ├── actions/          # All server actions (data mutations)
│   ├── admin/page.tsx    # Admin dashboard shell
│   ├── dashboard/page.tsx# User dashboard shell
│   └── api/              # REST API route handlers
├── components/
│   ├── admin/            # Admin-only feature components
│   ├── user/             # User-only feature components
│   ├── ui/               # Shared UI primitives (shadcn/ui)
│   └── Sidebar.tsx       # Shared sidebar navigation
├── lib/
│   ├── supabase/         # Supabase client variants
│   ├── email.ts          # Resend email templates
│   └── auth.tsx          # Auth context and useAuth hook
└── middleware.ts          # Session refresh on every request
```

Full annotated file tree → see `PROJECT_STRUCTURE.md`

---

## 9. Supabase Client — Which to Use Where

| File | Use When |
|---|---|
| `src/lib/supabase/client.ts` | Inside React client components |
| `src/lib/supabase/server.ts` | Inside server components or Route Handlers |
| `src/lib/supabase/admin.ts` | Inside server actions that need service-role access |

---

## 10. Deployment (Vercel)

### Step 1 — Install Vercel CLI
```bash
npm i -g vercel
```

### Step 2 — Deploy
```bash
vercel --token=YOUR_VERCEL_PAT
```

Follow the CLI prompts on first run (link or create project).

### Step 3 — Set Environment Variables
In Vercel dashboard → Project → **Settings → Environment Variables**, add all variables from `.env.local`.

Set `NEXT_PUBLIC_APP_URL` to your Vercel deployment URL:
```
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### Step 4 — Production Deploy
```bash
vercel --prod --token=YOUR_VERCEL_PAT
```

---

## 11. Email DNS Setup (anyasegen.com)

If setting up the sending domain from scratch on GoDaddy:

| Record | Type | Value |
|---|---|---|
| MX | MX | `mx.zoho.in` (Priority 10) |
| MX | MX | `mx2.zoho.in` (Priority 20) |
| MX | MX | `mx3.zoho.in` (Priority 50) |
| SPF | TXT | `v=spf1 include:zoho.in include:_spf.google.com ~all` |
| DKIM | TXT | Selector-based key from Zoho Mail settings |
| DMARC | TXT | `v=DMARC1; p=none` |

> ⚠️ Only one SPF record is allowed per domain. If Google Workspace SPF already exists, merge both into one record.

---

## 12. Common Issues

| Problem | Cause | Fix |
|---|---|---|
| `fetch failed` errors on dev server start | Supabase unreachable during cold start | Harmless — app still works, retry after network stabilises |
| Team member not receiving emails | Resend suppression list | Go to Resend dashboard → find the address → Remove from suppression list |
| "Open Dashboard" link in email is broken | `NEXT_PUBLIC_APP_URL` points to old ngrok or localhost | Update `.env.local` and restart dev server |
| `invalid input syntax for type uuid` on calendar save | `assigned_to` column is UUID type | Run the SQL fix in section 5 above |
| Admin sees user dashboard (or vice versa) | Wrong `role` value in `profiles` table | Update `role` to `admin` or `user` in Supabase Table Editor |

---

*End of Technical Setup Guide — ANYA SEGEN CRM*
