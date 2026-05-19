# Project Structure — ANYA SEGEN

Next.js 15 agency operations platform with admin and user dashboards, backed by Supabase.

## Feature Status

| Feature | Status | Notes |
|---|---|---|
| Admin dashboard | ✅ Live | Full tab-driven shell with lazy-loaded sections |
| User dashboard | ✅ Live | My Clients, My Tasks, Calendar, Messages, Knowledge Base, Profile |
| Mobile responsive layout | ✅ Done | Sidebar drawer overlay, responsive grids, mobile modals |
| Kanban board | ✅ Live | Drag-and-drop, dept filter, clickable stat cards, calendar date-range picker popover |
| Content calendar | ✅ Live | Month/week/day view, event scheduling |
| AI content generation | ✅ Live | Gemini 2.5 Flash Lite primary, Groq fallback |
| Grid planner (content) | ✅ Live | Drag-and-drop post grid with platform columns |
| Task assignment emails | ✅ Working | Resend + anyasegen.com Zoho domain; sends on assign & status change |
| In-app notifications | ✅ Live | Task assignment, workflow group membership, content approval events |
| Content workflow routing | ✅ Fixed | Internal Review (stage 3) → Final Approval (stage 4); correct chat room routing |
| Shared client detail view | ✅ Fixed | Admin client bypasses RLS; Back button uses selectedClientId state not SWR cache |
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
| Dashboard performance | ✅ Optimised | Lazy-mount tabs, sessionStorage profile cache, parallel DB queries, 5s auth timeout fallback |

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

## Special Users

| Name | Email | Access | Notes |
|---|---|---|---|
| Akhilesh Ji | satyamkr2806@gmail.com | Messages, Approvals, Content, Notifications, Profile | Final approval authority for content posts |
| Vikas | vikas@anyasegen.com | Clients, Messages, Assets, Weekly Report, Notifications, Profile | Restricted sidebar |
| Rakesh | rakesh@anyasegen.com | Clients, Messages, Assets, Weekly Report, Notifications, Profile | Restricted sidebar |

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
│   │   │   ├── admin-calendar.ts        # Content calendar CRUD
│   │   │   ├── admin-departments.ts     # Department management
│   │   │   ├── admin-documents.ts       # Knowledge-base document CRUD
│   │   │   ├── admin-kanban.ts          # Kanban tasks + email + in-app notifications on assign/move
│   │   │   ├── admin-stats.ts           # Dashboard stats aggregation
│   │   │   ├── admin-team.ts            # Team member management (parallel queries)
│   │   │   ├── ai-analysis.ts           # AI-powered client/content analysis
│   │   │   ├── ai-chat.ts               # Gemini/Groq AI chat with fallback logic
│   │   │   ├── approval.ts              # Send for final approval → Final Approval chat room
│   │   │   ├── approvals.ts             # Approval request helpers
│   │   │   ├── assets.ts                # File/asset management
│   │   │   ├── campaigns.ts             # Client campaign CRUD
│   │   │   ├── chat.ts                  # Messaging/chat (text + photo/video)
│   │   │   ├── client-demographics.ts   # Client demographic data
│   │   │   ├── client-intelligence.ts   # Client intelligence/news/insights
│   │   │   ├── client-sharing.ts        # Share clients with specific users
│   │   │   ├── content-posts.ts         # Social content posts; routes messages to correct workflow stage room
│   │   │   ├── grid-plans.ts            # Grid planner layout persistence
│   │   │   ├── invite-client.ts         # Client invite flow
│   │   │   ├── message-templates.ts     # Messaging bank template CRUD
│   │   │   ├── notifications.ts         # createNotificationForUser / notifyAdmins
│   │   │   ├── photo-approval.ts        # Photo approval token flow
│   │   │   ├── photo-workflow.ts        # Photo capture → storage → client asset workflow
│   │   │   ├── projects.ts              # Kanban project CRUD
│   │   │   ├── settings.ts              # Admin settings
│   │   │   ├── user-calendar.ts         # Calendar events for regular users
│   │   │   ├── user-clients.ts          # Clients shared with a user (admin client bypasses RLS)
│   │   │   ├── user-departments.ts      # Department info for regular users
│   │   │   ├── user-documents.ts        # Dept-scoped documents + getMyDepartmentName()
│   │   │   ├── user-tasks.ts            # Tasks assigned to a regular user
│   │   │   └── weekly-reports.ts        # Weekly report generation
│   │   ├── admin/
│   │   │   ├── assets/page.tsx          # Standalone admin assets page
│   │   │   ├── freepik/page.tsx         # Freepik stock asset browser
│   │   │   ├── istock/page.tsx          # iStock asset browser
│   │   │   └── page.tsx                 # Admin dashboard shell (lazy-mount tabs, mobile-ready)
│   │   ├── api/
│   │   │   ├── admin/users/route.ts     # List/manage auth users
│   │   │   ├── ai/generate-content/route.ts  # AI social content generation
│   │   │   ├── approval-reminders/route.ts   # Cron: send approval reminder emails every 5 min
│   │   │   ├── auth/profile/route.ts    # Fetch current user profile
│   │   │   ├── clients/[id]/route.ts    # Single client CRUD
│   │   │   ├── clients/route.ts         # Clients list + auto-creates 6 workflow rooms on new client
│   │   │   ├── demo-seed/route.ts       # Seed demo data
│   │   │   ├── documents/route.ts       # Documents list
│   │   │   ├── freepik-download/route.ts      # Proxy: download from Freepik
│   │   │   ├── istock-download/route.ts       # Proxy: download from iStock
│   │   │   ├── istock-media-manager/route.ts  # Proxy: iStock media management
│   │   │   ├── setup/                   # One-time migration/fix/backfill endpoints
│   │   │   │   ├── add-akhilesh-workflow-rooms/route.ts
│   │   │   │   ├── add-vikas-rakesh-content-posting/route.ts
│   │   │   │   ├── add-vikas-rakesh-stage1/route.ts
│   │   │   │   ├── check-ganesh-workflow/route.ts
│   │   │   │   ├── check-ishika/route.ts
│   │   │   │   ├── check-rupin/route.ts
│   │   │   │   ├── fix-deepanshu/route.ts
│   │   │   │   ├── fix-deepanshu-dept/route.ts
│   │   │   │   ├── fix-ganesh-workflow-members/route.ts
│   │   │   │   ├── fix-iqra/route.ts
│   │   │   │   ├── fix-mohit/route.ts
│   │   │   │   ├── fix-profile-emails/route.ts
│   │   │   │   ├── fix-rupin/route.ts
│   │   │   │   ├── fix-utkarsh/route.ts
│   │   │   │   ├── fix-vikas-rakesh/route.ts
│   │   │   │   ├── migrate-assets-date-folders/route.ts
│   │   │   │   ├── remove-vikas-rakesh-stages-2-3/route.ts
│   │   │   │   ├── reset-all-passwords/route.ts
│   │   │   │   ├── share-ganesh-team/route.ts
│   │   │   │   └── share-ganesh-vikas-rakesh/route.ts
│   │   │   ├── telegram/
│   │   │   │   ├── setup/route.ts       # Register Telegram webhook URL
│   │   │   │   └── webhook/route.ts     # Receive Telegram updates → save media to Supabase
│   │   │   ├── test/route.ts            # Health check endpoint
│   │   │   └── whatsapp/webhook/route.ts      # Twilio WhatsApp webhook (configured, not active)
│   │   ├── approve/
│   │   │   ├── [token]/
│   │   │   │   ├── page.tsx             # Content approval landing page (token-based)
│   │   │   │   └── ApprovalClient.tsx   # Client component for approval UI
│   │   │   └── photo/[token]/
│   │   │       ├── page.tsx             # Photo approval landing page
│   │   │       └── PhotoApprovalClient.tsx
│   │   ├── auth/
│   │   │   ├── auth-code-error/page.tsx
│   │   │   ├── callback/page.tsx        # Supabase OAuth callback
│   │   │   ├── confirm-email/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   ├── login/page.tsx
│   │   │   ├── reset-password/page.tsx
│   │   │   ├── set-password/page.tsx    # Set password for new invited users
│   │   │   └── signup/page.tsx
│   │   ├── client/page.tsx              # Public client-facing page
│   │   ├── dashboard/page.tsx           # User dashboard shell (lazy-mount, special-user routing)
│   │   ├── task/[id]/page.tsx           # Individual task view
│   │   ├── test-styles/page.tsx         # Style testing page
│   │   ├── globals.css
│   │   ├── layout.tsx                   # Root layout: AuthProvider, SWRProvider, fonts
│   │   └── page.tsx                     # Landing page with auth redirect
│   ├── components/
│   │   ├── admin/
│   │   │   ├── assets/
│   │   │   │   ├── AdminAssets.tsx
│   │   │   │   ├── AssetGrid.tsx
│   │   │   │   └── AssetUploader.tsx
│   │   │   ├── assignments/
│   │   │   │   └── AdminAssignments.tsx # Task assignment management
│   │   │   ├── clients/
│   │   │   │   ├── AdminClients.tsx
│   │   │   │   ├── ClientAssets.tsx
│   │   │   │   ├── ClientCampaigns.tsx  # Client campaign UI
│   │   │   │   ├── ClientChat.tsx
│   │   │   │   ├── ClientDemographics.tsx
│   │   │   │   ├── ClientNewsPanel.tsx
│   │   │   │   ├── ClientSharing.tsx
│   │   │   │   ├── ClientTwitterFeed.tsx
│   │   │   │   └── ManifestoPriorities.tsx
│   │   │   ├── content/
│   │   │   │   ├── AnySegen.tsx         # AnyaSegen content status view
│   │   │   │   ├── ContentCreator.tsx   # AI-assisted content creation (mobile dialogs)
│   │   │   │   ├── ContentHub.tsx       # Content tab shell (creator + grid planner tabs)
│   │   │   │   ├── GridPlanner.tsx      # Drag-and-drop social post grid planner
│   │   │   │   └── MessagingBank.tsx    # Saved messaging templates
│   │   │   ├── departments/
│   │   │   │   └── AdminDepartments.tsx
│   │   │   ├── documents/
│   │   │   │   └── AdminDocuments.tsx
│   │   │   ├── photos/
│   │   │   │   └── PhotoWorkflow.tsx    # Photo capture → approval → publish workflow
│   │   │   ├── settings/
│   │   │   │   └── AdminSettings.tsx
│   │   │   ├── team/
│   │   │   │   └── AdminTeamMembers.tsx
│   │   │   ├── AdminCalendar.tsx
│   │   │   ├── AdminKanban.tsx          # Kanban: clickable stat cards, calendar date-range filter
│   │   │   ├── AdminWeeklyReports.tsx
│   │   │   └── AnySegenRights.tsx       # Rights/permissions overview
│   │   ├── user/
│   │   │   ├── AkhileshApproval.tsx     # Final approval UI for Akhilesh Ji
│   │   │   ├── ChatPanel.tsx            # Team chat: direct + group, text + photo/video
│   │   │   ├── SharedClients.tsx        # Shared clients with RLS-bypass detail view
│   │   │   ├── UserAssets.tsx           # Asset library for regular users
│   │   │   ├── UserCalendar.tsx
│   │   │   ├── UserDepartments.tsx
│   │   │   ├── UserTasks.tsx
│   │   │   └── WeeklyReport.tsx
│   │   ├── ui/
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── calendar.tsx             # Custom month-view calendar (used in AdminCalendar)
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── event-modal.tsx
│   │   │   ├── input.tsx
│   │   │   ├── kanban-board.tsx
│   │   │   ├── label.tsx
│   │   │   ├── loading.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── task-card.tsx
│   │   │   ├── task-modal.tsx
│   │   │   ├── textarea.tsx
│   │   │   └── tooltip.tsx
│   │   ├── AdminRoute.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── LazyComponents.tsx
│   │   ├── Logo.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── Sidebar.tsx                  # Sidebar: admin / user / Akhilesh / Vikas-Rakesh menu sets
│   │   ├── SWRProvider.tsx
│   │   └── UserRoute.tsx
│   ├── hooks/
│   │   ├── admin/
│   │   │   ├── useDepartments.ts
│   │   │   └── useDocuments.ts
│   │   ├── useClients.ts
│   │   ├── useEvents.ts
│   │   ├── useSWR.ts                    # SWR hooks: shared clients, chat, tasks, admin team
│   │   └── useTasks.ts
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── admin.ts                 # Service-role client (server-only)
│   │   │   ├── client.ts                # Browser client (with env var guard)
│   │   │   ├── middleware.ts            # Session refresh middleware
│   │   │   └── server.ts               # Cookie-based server client
│   │   ├── admin-helper.ts
│   │   ├── auth.tsx                     # AuthProvider: 5s timeout fallback, sessionStorage cache
│   │   ├── demographics-constants.ts
│   │   ├── email.ts                     # Resend: task assign, status change, approval, meeting
│   │   ├── errors.ts
│   │   ├── supabase.ts                  # Legacy browser client re-export
│   │   ├── supabase-server.ts           # Legacy server client re-export
│   │   ├── utils.ts
│   │   └── whatsapp.ts                  # Twilio WhatsApp helper (configured, not active)
│   └── middleware.ts                    # Next.js middleware: session refresh on every request
├── docs/
│   ├── supabase-best-practices.md
│   └── supabase-issues-analysis.md
├── deck/                                # Static portfolio/pitch deck assets
├── ANYA_SEGEN_MASTER_SUMMARY.md
├── BUGS_REPORT.html
├── PROJECT_STRUCTURE.md                 # This file
├── CLAUDE.md
├── vercel.json                          # Vercel cron config (approval-reminders every 5 min)
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── package.json
└── .env.local                           # Not committed
```
