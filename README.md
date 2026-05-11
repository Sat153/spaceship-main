# ANYA SEGEN — Agency Operations Platform

A full-stack agency management CRM built with Next.js 15 and Supabase. Supports two roles — **Admin** and **User** — each with a dedicated dashboard.

---

## What It Does

**Admins can:**
- Manage clients, team members, and departments
- Assign tasks via a drag-and-drop Kanban board (with email notifications)
- Plan and schedule social media content with AI assistance
- Browse and upload assets (plus Freepik / iStock integration)
- Manage a knowledge base of department SOPs and documents
- View a content calendar with scheduling
- Chat with AI (per-client context)

**Users can:**
- View clients shared with them by admin
- Read knowledge base documents scoped to their department
- Chat with AI assistant
- Receive task assignment emails when work is assigned to them

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Database & Auth | Supabase (PostgreSQL + Auth) |
| Styling | Tailwind CSS + shadcn/ui |
| AI | Google Gemini 2.5 Flash Lite (primary), Groq (fallback) |
| Email | Resend SDK — sending domain: anyasegen.com via Zoho Mail |
| Deployment | Vercel |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project
- A Resend account with a verified sending domain
- Google AI API key (Gemini)
- Groq API key (optional fallback)

### Installation

```bash
git clone <repo-url>
cd spaceship-main
npm install
```

### Environment Variables

Create a `.env.local` file in the root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# AI
GOOGLE_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key

# Email
RESEND_API_KEY=your_resend_api_key

# App URL (used in email links — set to your deployed URL in production)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Important:** `NEXT_PUBLIC_APP_URL` must be updated to your Vercel deployment URL before going live, otherwise email links will point to localhost.

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

See [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) for a full annotated file tree, feature status, and infrastructure notes.

---

## User Roles

| Role | Access |
|---|---|
| `admin` | Full dashboard — clients, team, kanban, calendar, content, assets, documents, settings |
| `user` | Limited dashboard — shared clients, knowledge base, messages, profile |

Role is stored in the `profiles` table (`role` column). Set to `admin` or `user` in Supabase.

---

## Email Notifications

Task assignment emails are sent via **Resend** when:
- A task is assigned to a team member (new or reassigned)
- A task's status is moved on the Kanban board

**DNS setup on anyasegen.com (GoDaddy):**
- MX → Zoho Mail
- SPF → `v=spf1 include:zoho.in include:_spf.google.com ~all`
- DKIM → selector-based TXT (verified)
- DMARC → `v=DMARC1; p=none` (verified)

> If a team member stops receiving emails, check the **Resend suppression list** — bounced addresses are auto-blacklisted.

---

## Deployment (Vercel)

```bash
npm i -g vercel
vercel --token=YOUR_VERCEL_PAT
```

On first deploy, follow the CLI prompts to link/create the project.

Then in Vercel dashboard → Project → Settings → Environment Variables, add all variables from `.env.local` and set `NEXT_PUBLIC_APP_URL` to your Vercel domain (e.g. `https://anyasegen.vercel.app`).

For production deploys:

```bash
vercel --prod --token=YOUR_VERCEL_PAT
```

---

## Development Commands

```bash
npm run dev      # Start dev server on localhost:3000
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

---

## Supabase Client Usage

| File | When to use |
|---|---|
| `src/lib/supabase/client.ts` | Client components |
| `src/lib/supabase/server.ts` | Server components / Route Handlers |
| `src/lib/supabase/admin.ts` | Server Actions needing service-role bypass |
| `src/lib/supabase.ts` | Legacy re-export (some older client components) |
