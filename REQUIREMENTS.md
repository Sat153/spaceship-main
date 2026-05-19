# Functional Requirements — ANYA SEGEN CRM

**Project:** ANYA SEGEN Agency Operations Platform
**Prepared by:** Satyam (AI Engineer)
**Version:** 1.1
**Date:** May 2026

---

## 1. Overview

ANYA SEGEN is an internal agency operations platform designed to manage clients, team members, tasks, content, and communications. The system supports two primary roles — **Admin** and **User** — plus three special-access user types with restricted sidebar menus.

---

## 2. User Roles

| Role | Description |
|---|---|
| **Admin** | Full access to all modules — manages team, clients, tasks, content, and system settings |
| **User** | Limited access — views shared clients, department documents, tasks, and receives notifications |
| **Akhilesh Ji** | Special user (satyamkr2806@gmail.com) — access to Messages, Approvals, Content, Notifications, Profile only |
| **Vikas / Rakesh** | Special users — access to Clients, Messages, Assets, Weekly Report, Notifications, Profile only |

Role is assigned during account creation and can only be changed by an admin.

---

## 3. Authentication

| # | Requirement |
|---|---|
| FR-01 | Users must log in with email and password |
| FR-02 | Users who forget their password can request a reset link via email |
| FR-03 | New users invited by admin receive a set-password email to activate their account |
| FR-04 | The system automatically refreshes sessions to keep users logged in |
| FR-05 | Unauthenticated users are redirected to the login page |
| FR-06 | Admin users are redirected to the admin dashboard; regular users to the user dashboard |
| FR-07 | Auth loading has a 5-second fallback timeout to prevent infinite spinner on network issues |

---

## 4. Admin Dashboard

### 4.1 Overview
| # | Requirement |
|---|---|
| FR-08 | Admin can see a summary of total clients, team members, tasks, and content posts |
| FR-09 | Overview shows quick-access stats for the kanban board, calendar, and content |

### 4.2 Team Management
| # | Requirement |
|---|---|
| FR-10 | Admin can view a list of all team members with their name, email, role, and department |
| FR-11 | Admin can invite new team members by entering their email address |
| FR-12 | Invited users receive an email with a link to set their password |
| FR-13 | Admin can change a team member's role (admin / user) |
| FR-14 | Admin can assign team members to departments |
| FR-15 | Admin can remove team members from the system |

### 4.3 Department Management
| # | Requirement |
|---|---|
| FR-16 | Admin can create, edit, and delete departments |
| FR-17 | Departments are used to group team members, documents, and tasks |
| FR-18 | Each team member belongs to one department |

### 4.4 Client Management
| # | Requirement |
|---|---|
| FR-19 | Admin can create, edit, and delete client profiles |
| FR-20 | Each client profile can include name, contact details, industry, manifesto, priorities, and social media handles |
| FR-21 | Admin can view AI-generated intelligence and demographic analysis per client |
| FR-22 | Admin can view a live news feed related to a client |
| FR-23 | Admin can view and embed a Twitter/X feed per client |
| FR-24 | Admin can share individual clients with specific team members |
| FR-25 | Admin can upload and manage assets linked to a specific client |
| FR-26 | When a new client is created, 6 workflow stage chat rooms are automatically created and members are auto-added based on department |

### 4.5 Asset Library
| # | Requirement |
|---|---|
| FR-27 | Admin can upload files (images, videos, documents) to the asset library |
| FR-28 | Assets are displayed in a grid view with preview |
| FR-29 | Admin can browse and download stock assets from Freepik and iStock |
| FR-30 | Assets can be linked to specific clients |

### 4.6 Knowledge Base (Documents)
| # | Requirement |
|---|---|
| FR-31 | Admin can create, edit, and delete knowledge base documents (SOPs, guides, procedures) |
| FR-32 | Each document is assigned to a department |
| FR-33 | Admin can publish or unpublish documents |
| FR-34 | Only published documents are visible to regular users |
| FR-35 | Documents can be tagged for easier searching |

### 4.7 Kanban Board
| # | Requirement |
|---|---|
| FR-36 | Admin can create tasks with title, description, type, priority, status, department, start date, due date, and estimated hours |
| FR-37 | Tasks are displayed in a drag-and-drop kanban board with columns: To Do, In Progress, Review, Completed, Cancelled |
| FR-38 | Admin can drag tasks between columns to update their status |
| FR-39 | Admin can assign tasks to specific team members |
| FR-40 | When a task is assigned, the assigned team member receives an email notification and an in-app notification |
| FR-41 | When a task's status is changed via drag, the assigned team member receives a status update email |
| FR-42 | Admin can filter tasks by priority, assignee, project, and date assigned |
| FR-43 | Stat cards (Total, To Do, In Progress, Review, Completed, Overdue) are clickable and filter the board |
| FR-44 | Date filter uses a calendar date-range picker popover (click start date, then end date) |
| FR-45 | Admin can group tasks under Projects; each project can optionally be linked to a client |
| FR-46 | Estimated hours are auto-calculated based on start and due date |
| FR-47 | Admin can edit and delete tasks |

### 4.8 Content Calendar
| # | Requirement |
|---|---|
| FR-48 | Admin can view a calendar in month, week, and day views |
| FR-49 | Admin can create calendar events with title, type, date, time, location, and meeting URL |
| FR-50 | Events can be assigned a priority and colour |
| FR-51 | Admin can assign specific team members to an event |
| FR-52 | When a meeting is created, email invitations are sent to assigned members |
| FR-53 | Scheduled social media posts appear on the calendar automatically |
| FR-54 | Admin can edit and delete events |

### 4.9 Content Creator & Workflow
| # | Requirement |
|---|---|
| FR-55 | Admin can create social media posts for clients across platforms: Twitter/X, Instagram, Facebook, LinkedIn, YouTube |
| FR-56 | Admin can use AI (Gemini 2.5 Flash Lite, with Groq as fallback) to generate post content |
| FR-57 | Content workflow: Draft → Pending Review → Internal Review → Awaiting Approval → Approved / Rejected |
| FR-58 | Submitting for review posts a message to the Internal Review chat room (stage 3) and notifies admins |
| FR-59 | Approving/rejecting at Internal Review posts to the Internal Review chat room |
| FR-60 | Sending to Akhilesh Ji for final approval posts to the Final Approval chat room (stage 4) and notifies admins |
| FR-61 | Akhilesh Ji approves/rejects from his Approvals tab; this posts to the Final Approval chat room |
| FR-62 | Admin can schedule posts for a specific date and time |
| FR-63 | The approval email to Akhilesh Ji contains Approve and Reject buttons |
| FR-64 | Approval reminder emails are sent automatically via a Vercel cron job (every 5 minutes) |
| FR-65 | Admin can manage posts using a Grid Planner with drag-and-drop organisation by platform |

### 4.10 Messaging Bank
| # | Requirement |
|---|---|
| FR-66 | Admin can save and manage reusable messaging templates |
| FR-67 | Templates can be browsed and copied when creating content |

### 4.11 Messages (Admin Chat)
| # | Requirement |
|---|---|
| FR-68 | Admin can send and receive messages with team members through an internal chat panel |
| FR-69 | Admin and team members can send images and videos in chat |

### 4.12 Weekly Reports
| # | Requirement |
|---|---|
| FR-70 | Admin can view and generate weekly activity reports |

### 4.13 Settings
| # | Requirement |
|---|---|
| FR-71 | Admin can manage system-level settings from the Settings tab |

---

## 5. User Dashboard

### 5.1 My Clients
| # | Requirement |
|---|---|
| FR-72 | Regular users can view only the clients that have been shared with them by an admin |
| FR-73 | Clicking "Details" fetches full client info (bypasses RLS using admin client after verifying share) |
| FR-74 | Users can view client files and AI intelligence scoped to each shared client |
| FR-75 | Back navigation from detail view is controlled by component state (not SWR cache) |

### 5.2 Knowledge Base
| # | Requirement |
|---|---|
| FR-76 | Users can view published documents that belong to their department |
| FR-77 | Users can search documents by title, content, or tags |
| FR-78 | Users can open a full-screen view of any document |

### 5.3 Messages
| # | Requirement |
|---|---|
| FR-79 | Users can send and receive messages with admins through the internal chat panel |
| FR-80 | Users can send images and videos in chat |

### 5.4 Notifications
| # | Requirement |
|---|---|
| FR-81 | Users receive in-app notifications when a task is assigned to them |
| FR-82 | Users receive in-app notifications when added to a client workflow chat room |
| FR-83 | Users can view their full notification history in the Notifications tab |
| FR-84 | Unread notification count is shown as a badge on the Notifications sidebar item |

### 5.5 Tasks
| # | Requirement |
|---|---|
| FR-85 | Users can view tasks assigned to them |
| FR-86 | Users can mark tasks as In Progress from their task list, which syncs to the admin Kanban board |

### 5.6 Calendar
| # | Requirement |
|---|---|
| FR-87 | Users can view calendar events relevant to their department |

### 5.7 Assets
| # | Requirement |
|---|---|
| FR-88 | Users can browse the asset library for files shared with them |

### 5.8 Profile
| # | Requirement |
|---|---|
| FR-89 | Users can view their own profile: name, email, department, and role |

---

## 6. Email Notifications

| # | Trigger | Recipient |
|---|---|---|
| FR-90 | Task assigned to a user | Assigned team member |
| FR-91 | Task reassigned to a different user | New assigned team member |
| FR-92 | Task status changed via kanban drag | Currently assigned team member |
| FR-93 | Meeting created with department selected | Selected members (or all dept members) |
| FR-94 | Content post sent to Akhilesh Ji for final approval | Akhilesh Ji |
| FR-95 | Approval reminder (cron, every 5 min for pending posts) | Akhilesh Ji |
| FR-96 | New user invited | Invited user (set-password link) |

All emails are sent from `noreply@anyasegen.com` via Resend using the Zoho Mail sending domain.

---

## 7. In-App Notifications

| # | Trigger | Recipient |
|---|---|---|
| FR-97 | Task assigned or reassigned | Assigned team member |
| FR-98 | Added to a client workflow chat room | Each member added |
| FR-99 | Content post submitted for review | All admins |
| FR-100 | Content post sent for final approval | All admins |

---

## 8. Telegram Integration

| # | Requirement |
|---|---|
| FR-101 | A Telegram bot (@AnyaSegenMediaBot) is added to client Telegram groups |
| FR-102 | When a photo or video is sent in a group, the bot captures and uploads it to Supabase Storage |
| FR-103 | The uploaded media is linked to the Ganesh Joshi client and visible under My Clients → Files |
| FR-104 | File size limit: 20MB (Telegram Bot API restriction) |

---

## 9. AI Features

| # | Requirement |
|---|---|
| FR-105 | Admin can chat with an AI assistant scoped to a specific client's context |
| FR-106 | Regular users have access to a general AI chat assistant |
| FR-107 | AI generates social media post content based on client name, platform, and tone |
| FR-108 | AI analyses client demographics and generates intelligence summaries |
| FR-109 | Primary AI: Google Gemini 2.5 Flash Lite. Fallback: Groq |

---

## 10. Access Control Rules

| Rule | Detail |
|---|---|
| AC-01 | Regular users cannot access the admin dashboard |
| AC-02 | Admin users cannot access the user dashboard |
| AC-03 | Users can only see documents from their own department |
| AC-04 | Users can only see clients explicitly shared with them |
| AC-05 | All data mutations require authentication |
| AC-06 | Admin server actions use a service-role key — never exposed to the browser |
| AC-07 | Akhilesh Ji (satyamkr2806@gmail.com) sees only: Messages, Approvals, Content, Notifications, Profile |
| AC-08 | Vikas and Rakesh see only: Clients, Messages, Assets, Weekly Report, Notifications, Profile |
| AC-09 | Content tab is accessible to PR & Social Media, Creative Labs, Operations & Strategy departments, and Akhilesh Ji |
| AC-10 | Kanban tab is accessible to Ishika, Utkarsh, and Iqra in addition to admins |

---

## 11. Non-Functional Requirements

| # | Requirement |
|---|---|
| NFR-01 | The application is fully responsive — works on mobile, tablet, and desktop |
| NFR-02 | All pages load within 3 seconds on a standard broadband connection |
| NFR-03 | Email notifications are delivered within 1 minute of the triggering action |
| NFR-04 | The system remains operational if the AI provider is temporarily unavailable (fallback logic) |
| NFR-05 | The application is deployed on Vercel for high availability |
| NFR-06 | All user passwords are managed by Supabase Auth — never stored in plain text |
| NFR-07 | Dashboard tab content is lazy-mounted — only loaded on first visit, then kept alive to avoid refetches |
| NFR-08 | Auth session loading has a 5-second safety timeout to prevent infinite spinner |

---

*End of Functional Requirements — ANYA SEGEN CRM v1.1*
