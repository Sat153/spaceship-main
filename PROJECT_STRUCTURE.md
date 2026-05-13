# Project Structure — ANYA SEGEN

Next.js 15 agency operations platform with admin and user dashboards, backed by Supabase.

## Feature Status

| Feature | Status | Notes |
|---|---|---|
| Admin dashboard | ✅ Live | Full tab-driven shell with lazy-loaded sections |
| User dashboard | ✅ Live | My Clients, My Tasks, Calendar, Messages, Knowledge Base, Profile |
| Mobile responsive layout | ✅ Done | Sidebar drawer overlay, responsive grids, mobile modals |
| Kanban board | ✅ Live | Drag-and-drop, dept filter, auto hours, task modal |
| Content calendar | ✅ Live | Month/week/day view, event scheduling |
| AI content generation | ✅ Live | Gemini 2.5 Flash Lite primary, Groq fallback |
| Grid planner (content) | ✅ Live | Drag-and-drop post grid with platform columns |
| Task assignment emails | ✅ Working | Resend + anyasegen.com Zoho domain; sends on assign & status change |
| Zoho Mail DNS setup | ✅ Complete | MX, SPF (merged), DKIM, DMARC all verified on anyasegen.com |
| Knowledge base (docs) | ✅ Live | Dept-scoped, published-only docs for regular users |
| Client management | ✅ Live | Admin CRUD + sharing with specific users |
| AI chat | ✅ Live | Per-client and global chat with Gemini/Groq |
| Asset library | ✅ Live | Upload, grid display, Freepik/iStock browser |
| Team management | ✅ Live | Invite, role editor, department assignment |
| Messaging bank | ✅ Live | Saved messaging templates |
| Telegram media capture | ✅ Live | Bot captures photos/videos from groups → Supabase Storage → Client Files |
| Photo sharing in chat | ✅ Live | Team members can send images/videos in Messages tab |
| Vercel deployment | ✅ Live | app.anyasegen.com — domain verified and assigned to correct project |
| Dashboard performance | ✅ Optimised | Lazy-mount tabs, sessionStorage profile cache, parallel DB queries |

## Team & Access

| Name | Email | Department | CRM Access |
|---|---|---|---|
| Rupin | rupin@anyasegen.com | Creative Labs | ✅ |
| Deepanshu | deepanshu@anyasegen.com | Creative Labs | ✅ |
| Robin | robin@anyasegen.com | Creative Labs | ✅ |
| Vishal | vishal@anyasegen.com | Creative Labs | ✅ |
| Mohit | mohit@anyasegen.com | Creative Labs | ✅ |
| Utkarsh | utkarsh@anyasegen.com | PR & Social Media | ✅ |
| Ishika | ishika@anyasegen.com | PR & Social Media | ✅ |
| Iqra | iqra@anyasegen.com | Operations & Strategy | ✅ |

All 8 team members have Ganesh Joshi shared in their My Clients section.

## Telegram Bot

- **Bot**: @AnyaSegenMediaBot (token in `.env.local`)
- **Webhook**: `https://app.anyasegen.com/api/telegram/webhook`
- **Flow**: Bot added to group → client sends photo/video → webhook fires → file downloaded → uploaded to Supabase Storage → asset record created with `client_id = Ganesh Joshi` → visible in CRM under My Clients → Files
- **Limit**: Telegram bot API only allows downloading files up to 20MB
- **Groups**: Bot must be added as member to each Telegram group to receive media

## Email Infrastructure

- **Provider**: Resend SDK (`src/lib/email.ts`)
- **Sending domain**: `anyasegen.com` (verified in Resend)
- **Mail server**: Zoho Mail (DNS on GoDaddy)
- **DNS records configured**:
  - MX → `mx.zoho.in`, `mx2.zoho.in`, `mx3.zoho.in`
  - SPF → `v=spf1 include:zoho.in include:_spf.google.com ~all` (merged)
  - DKIM → selector-based TXT record (verified)
  - DMARC → `v=DMARC1; p=none` TXT record (verified)
- **Trigger points**: task assigned (new/changed assignee), task status moved via kanban drag
- **Known gotcha**: Resend auto-suppresses bounced addresses — check Resend suppression list if a recipient stops getting emails

## Production URLs

| Resource | URL |
|---|---|
| CRM (admin) | https://app.anyasegen.com/admin |
| CRM (team) | https://app.anyasegen.com/dashboard |
| Login | https://app.anyasegen.com/auth/login |
| Telegram webhook | https://app.anyasegen.com/api/telegram/webhook |

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY       # used by admin server actions
GOOGLE_API_KEY                  # Gemini 2.5 Flash Lite for AI chat
GROQ_API_KEY                    # Groq fallback for AI chat
RESEND_API_KEY                  # Email sending via Resend
NEXT_PUBLIC_APP_URL             # https://app.anyasegen.com (set in Vercel)
TELEGRAM_BOT_TOKEN              # Telegram bot API token
TELEGRAM_WEBHOOK_SECRET         # Webhook secret (currently unused in verification)
TWILIO_ACCOUNT_SID              # WhatsApp via Twilio (configured, not active)
TWILIO_AUTH_TOKEN
TWILIO_WHATSAPP_NUMBER
CRON_SECRET                     # For Vercel cron job auth
```

## Mobile Responsive Layout

All major views updated to support mobile screens:

- **Sidebar** (`Sidebar.tsx`): Fixed overlay drawer on mobile (`fixed + translate-x`), sticky in flex flow on desktop (`md:sticky`). Backdrop overlay + X close button on mobile. Hamburger trigger in both shell pages.
- **Admin shell** (`app/admin/page.tsx`): Mobile top bar (hamburger + logo), `p-4 md:p-8`, responsive stat grids (`sm:grid-cols-2 md:grid-cols-3`)
- **User shell** (`app/dashboard/page.tsx`): Same mobile top bar treatment
- **Kanban** (`AdminKanban.tsx`): Responsive filter selects (`w-full sm:w-44`), stats grid (`grid-cols-3 sm:grid-cols-6`)
- **Task modal** (`ui/task-modal.tsx`): `w-[95vw]` + `max-h-[90vh] overflow-y-auto`
- **Content Creator** (`ContentCreator.tsx`): `w-[95vw]` on all dialogs, flex-wrap header
- **Grid Planner** (`GridPlanner.tsx`): Responsive platform grid (`grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`), stacked header on mobile

---

## File Tree

```
spaceship-main/
├── src/
│   ├── app/
│   │   ├── actions/
│   │   │   ├── admin-calendar.ts        # Server actions for content calendar CRUD
│   │   │   ├── admin-departments.ts     # Server actions for department management
│   │   │   ├── admin-documents.ts       # Server actions for knowledge-base documents
│   │   │   ├── admin-kanban.ts          # Server actions for kanban tasks + email on assign/move
│   │   │   ├── admin-team.ts            # Server actions for team member management
│   │   │   ├── ai-analysis.ts           # AI-powered client/content analysis actions
│   │   │   ├── ai-chat.ts               # Gemini/Groq AI chat with fallback logic
│   │   │   ├── assets.ts                # Server actions for file/asset management
│   │   │   ├── chat.ts                  # Messaging/chat server actions (text + photo/video)
│   │   │   ├── client-demographics.ts   # Client demographic data server actions
│   │   │   ├── client-intelligence.ts   # Client intelligence/insights server actions
│   │   │   ├── client-sharing.ts        # Share clients with specific users
│   │   │   ├── content-posts.ts         # Social content post CRUD actions
│   │   │   └── user-clients.ts          # Fetch clients shared with a regular user
│   │   ├── admin/
│   │   │   ├── assets/page.tsx          # Standalone admin assets page
│   │   │   ├── freepik/page.tsx         # Freepik stock asset browser page
│   │   │   ├── istock/page.tsx          # iStock asset browser page
│   │   │   └── page.tsx                 # Main admin dashboard shell (lazy-mount tabs, mobile-ready)
│   │   ├── api/
│   │   │   ├── admin/users/route.ts     # REST endpoint: list/manage auth users
│   │   │   ├── ai/generate-content/route.ts  # REST endpoint: AI social content generation
│   │   │   ├── approval-reminders/route.ts   # Cron endpoint: send approval reminder emails
│   │   │   ├── auth/profile/route.ts    # REST endpoint: fetch current user profile
│   │   │   ├── clients/[id]/route.ts    # REST endpoint: single client CRUD
│   │   │   ├── clients/route.ts         # REST endpoint: clients list
│   │   │   ├── documents/route.ts       # REST endpoint: documents list
│   │   │   ├── freepik-download/route.ts      # Proxy: download assets from Freepik
│   │   │   ├── istock-download/route.ts       # Proxy: download assets from iStock
│   │   │   ├── istock-media-manager/route.ts  # Proxy: iStock media management API
│   │   │   ├── telegram/
│   │   │   │   ├── setup/route.ts       # One-time endpoint to register Telegram webhook URL
│   │   │   │   └── webhook/route.ts     # Receives Telegram updates, saves media to Supabase
│   │   │   └── whatsapp/webhook/route.ts      # Twilio WhatsApp webhook (configured, not active)
│   │   ├── auth/
│   │   │   ├── auth-code-error/page.tsx # Error page for OAuth code exchange failures
│   │   │   ├── callback/page.tsx        # Supabase OAuth callback — handles invite/recovery/login tokens
│   │   │   ├── confirm-email/page.tsx   # Email confirmation landing page
│   │   │   ├── forgot-password/page.tsx # Trigger password reset email
│   │   │   ├── login/page.tsx           # Email/password login page
│   │   │   ├── reset-password/page.tsx  # Reset password with recovery token
│   │   │   ├── set-password/page.tsx    # Set password for new invited users
│   │   │   └── signup/page.tsx          # New user registration page
│   │   ├── dashboard/
│   │   │   └── page.tsx                 # User dashboard shell (lazy-mount tabs, mobile-ready)
│   │   ├── task/[id]/
│   │   │   └── page.tsx                 # Individual task view page
│   │   ├── globals.css                  # Primary global styles and Tailwind base
│   │   ├── layout.tsx                   # Root layout: AuthProvider, SWRProvider, fonts
│   │   └── page.tsx                     # Landing/home page with auth redirect
│   ├── components/
│   │   ├── admin/
│   │   │   ├── assets/
│   │   │   │   ├── AdminAssets.tsx      # Admin asset library management UI
│   │   │   │   ├── AssetGrid.tsx        # Grid display for uploaded assets
│   │   │   │   └── AssetUploader.tsx    # Drag-and-drop asset upload component
│   │   │   ├── clients/
│   │   │   │   ├── AdminClients.tsx     # Main client management panel
│   │   │   │   ├── ClientAssets.tsx     # Assets linked to a specific client
│   │   │   │   ├── ClientChat.tsx       # AI chat panel scoped to a client
│   │   │   │   ├── ClientDemographics.tsx   # Demographic charts for a client
│   │   │   │   ├── ClientNewsPanel.tsx  # Live news feed related to a client
│   │   │   │   ├── ClientSharing.tsx    # UI to share a client with team members
│   │   │   │   ├── ClientTwitterFeed.tsx    # Twitter/X feed embed for a client
│   │   │   │   └── ManifestoPriorities.tsx  # Client manifesto/priority editor
│   │   │   ├── content/
│   │   │   │   ├── ContentCreator.tsx   # AI-assisted social content creation UI (mobile dialogs)
│   │   │   │   └── GridPlanner.tsx      # Drag-and-drop social post grid planner (responsive)
│   │   │   ├── departments/
│   │   │   │   └── AdminDepartments.tsx # Department list and editor
│   │   │   ├── documents/
│   │   │   │   └── AdminDocuments.tsx   # Knowledge-base document manager
│   │   │   ├── team/
│   │   │   │   └── AdminTeamMembers.tsx # Team member list, invite, and role editor
│   │   │   ├── AdminCalendar.tsx        # Content calendar with scheduling UI
│   │   │   └── AdminKanban.tsx          # Drag-and-drop kanban board (mobile-responsive)
│   │   ├── user/
│   │   │   ├── ChatPanel.tsx            # Team chat: direct + group, text + photo/video sharing
│   │   │   ├── SharedClients.tsx        # Clients shared with the current user (SWR cached)
│   │   │   ├── UserCalendar.tsx         # Calendar view for regular users
│   │   │   └── UserTasks.tsx            # Task list for regular users
│   │   ├── ui/
│   │   │   ├── badge.tsx                # Shadcn badge primitive
│   │   │   ├── button.tsx               # Shadcn button with CVA variants
│   │   │   ├── calendar.tsx             # Shadcn calendar (date picker)
│   │   │   ├── card.tsx                 # Shadcn card container
│   │   │   ├── dialog.tsx               # Shadcn modal/dialog
│   │   │   ├── dropdown-menu.tsx        # Shadcn dropdown menu
│   │   │   ├── event-modal.tsx          # Modal for creating/editing calendar events
│   │   │   ├── input.tsx                # Shadcn text input
│   │   │   ├── kanban-board.tsx         # Kanban column and card layout primitives
│   │   │   ├── label.tsx                # Shadcn form label
│   │   │   ├── loading.tsx              # Spinner/skeleton loading states
│   │   │   ├── scroll-area.tsx          # Shadcn scrollable container
│   │   │   ├── select.tsx               # Shadcn select/dropdown
│   │   │   ├── table.tsx                # Shadcn data table
│   │   │   ├── tabs.tsx                 # Shadcn tab navigation
│   │   │   ├── task-card.tsx            # Kanban task card display
│   │   │   ├── task-modal.tsx           # Modal for creating/editing kanban tasks (mobile-safe)
│   │   │   ├── textarea.tsx             # Shadcn textarea input
│   │   │   └── tooltip.tsx              # Shadcn tooltip
│   │   ├── AdminRoute.tsx               # Route guard: redirects non-admins
│   │   ├── ErrorBoundary.tsx            # React error boundary for graceful failures
│   │   ├── LazyComponents.tsx           # Dynamic imports for code-split dashboard sections
│   │   ├── Logo.tsx                     # Brand logo component
│   │   ├── ProtectedRoute.tsx           # Route guard: redirects unauthenticated users
│   │   ├── Sidebar.tsx                  # Sidebar: desktop sticky + mobile overlay drawer
│   │   ├── SWRProvider.tsx              # SWR global config/cache provider
│   │   └── UserRoute.tsx                # Route guard: redirects non-regular-users
│   ├── hooks/
│   │   ├── admin/
│   │   │   ├── useDepartments.ts        # SWR hook to fetch department list
│   │   │   └── useDocuments.ts          # SWR hook to fetch documents
│   │   ├── useClients.ts                # SWR hook to fetch clients
│   │   ├── useEvents.ts                 # SWR hook to fetch calendar events
│   │   ├── useSWR.ts                    # Generic typed SWR wrapper (chat, clients, tasks)
│   │   └── useTasks.ts                  # SWR hook to fetch kanban tasks
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── admin.ts                 # Service-role Supabase client (server-only)
│   │   │   ├── client.ts                # Browser Supabase client for client components
│   │   │   ├── middleware.ts            # Session refresh + JWT-based role redirect (no DB call)
│   │   │   └── server.ts                # Cookie-based Supabase client for server components
│   │   ├── admin-helper.ts              # Utility helpers for admin server actions
│   │   ├── auth.tsx                     # AuthProvider: session, profile (sessionStorage cached), signOut
│   │   ├── demographics-constants.ts    # Static options for demographic form fields
│   │   ├── email.ts                     # Resend: task assignment, status update, approval, meeting invite
│   │   ├── errors.ts                    # Typed error classes and error handling utils
│   │   ├── supabase.ts                  # Legacy browser client re-export
│   │   ├── supabase-server.ts           # Legacy server client re-export
│   │   └── utils.ts                     # General utility functions (cn, etc.)
│   └── middleware.ts                    # Next.js middleware: session refresh on every request
├── docs/
│   ├── supabase-best-practices.md       # Internal Supabase usage guidelines
│   └── supabase-issues-analysis.md      # Analysis of past Supabase auth/query issues
├── deck/                                # Static portfolio/pitch deck images and HTML
├── ANYA_SEGEN_MASTER_SUMMARY.md         # Full stakeholder, workflow, and requirements document
├── BUGS_REPORT.html                     # Complete bug report — 20 bugs fixed across 5 categories
├── PROJECT_STRUCTURE.md                 # This file — feature status, infra notes, file tree
├── CLAUDE.md                            # Claude Code project instructions
├── vercel.json                          # Vercel cron config (approval-reminders every 5 min)
├── next.config.js                       # Next.js config (image domains, redirects)
├── tailwind.config.js                   # Tailwind CSS configuration
├── postcss.config.js                    # PostCSS config for Tailwind
├── tsconfig.json                        # TypeScript config with @/* path alias
├── package.json                         # Dependencies and npm scripts
└── .env.local                           # Local environment variables (not committed)
```
