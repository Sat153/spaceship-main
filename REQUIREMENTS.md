# Functional Requirements — ANYA SEGEN CRM

**Project:** ANYA SEGEN Agency Operations Platform
**Prepared by:** Satyam (AI Engineer)
**Version:** 1.0
**Date:** May 2026

---

## 1. Overview

ANYA SEGEN is an internal agency operations platform designed to manage clients, team members, tasks, content, and communications. The system supports two roles — **Admin** and **User** — each with a dedicated dashboard and defined access boundaries.

---

## 2. User Roles

| Role | Description |
|---|---|
| **Admin** | Full access to all modules — manages team, clients, tasks, content, and system settings |
| **User** | Limited access — views shared clients, department documents, and receives task/meeting notifications |

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

---

## 4. Admin Dashboard

### 4.1 Overview
| # | Requirement |
|---|---|
| FR-07 | Admin can see a summary of total clients, team members, tasks, and content posts |
| FR-08 | Overview shows quick-access stats for the kanban board, calendar, and content |

### 4.2 Team Management
| # | Requirement |
|---|---|
| FR-09 | Admin can view a list of all team members with their name, email, role, and department |
| FR-10 | Admin can invite new team members by entering their email address |
| FR-11 | Invited users receive an email with a link to set their password |
| FR-12 | Admin can change a team member's role (admin / user) |
| FR-13 | Admin can assign team members to departments |
| FR-14 | Admin can remove team members from the system |

### 4.3 Department Management
| # | Requirement |
|---|---|
| FR-15 | Admin can create, edit, and delete departments |
| FR-16 | Departments are used to group team members, documents, and tasks |
| FR-17 | Each team member belongs to one department |

### 4.4 Client Management
| # | Requirement |
|---|---|
| FR-18 | Admin can create, edit, and delete client profiles |
| FR-19 | Each client profile can include name, contact details, industry, manifesto, and priorities |
| FR-20 | Admin can view AI-generated intelligence and demographic analysis per client |
| FR-21 | Admin can view a live news feed related to a client |
| FR-22 | Admin can view and embed a Twitter/X feed per client |
| FR-23 | Admin can share individual clients with specific team members |
| FR-24 | Admin can upload and manage assets linked to a specific client |

### 4.5 Asset Library
| # | Requirement |
|---|---|
| FR-25 | Admin can upload files (images, videos, documents) to the asset library |
| FR-26 | Assets are displayed in a grid view with preview |
| FR-27 | Admin can browse and download stock assets from Freepik and iStock |
| FR-28 | Assets can be linked to specific clients |

### 4.6 Knowledge Base (Documents)
| # | Requirement |
|---|---|
| FR-29 | Admin can create, edit, and delete knowledge base documents (SOPs, guides, procedures) |
| FR-30 | Each document is assigned to a department |
| FR-31 | Admin can publish or unpublish documents |
| FR-32 | Only published documents are visible to regular users |
| FR-33 | Documents can be tagged for easier searching |

### 4.7 Kanban Board
| # | Requirement |
|---|---|
| FR-34 | Admin can create tasks with title, description, type, priority, status, department, start date, due date, and estimated hours |
| FR-35 | Tasks are displayed in a drag-and-drop kanban board with columns: To Do, In Progress, Review, Completed, Cancelled |
| FR-36 | Admin can drag tasks between columns to update their status |
| FR-37 | Admin can assign tasks to specific team members |
| FR-38 | When a task is assigned to a team member, the system automatically sends them an email notification |
| FR-39 | When a task's status is changed (via drag), the assigned team member receives a status update email |
| FR-40 | Admin can filter tasks by department |
| FR-41 | Estimated hours are auto-calculated based on start and due date |
| FR-42 | Admin can edit and delete tasks |

### 4.8 Content Calendar
| # | Requirement |
|---|---|
| FR-43 | Admin can view a calendar in month, week, and day views |
| FR-44 | Admin can create calendar events with title, type (meeting, deadline, reminder, etc.), date, time, location, and meeting URL |
| FR-45 | Events can be assigned a priority (low, medium, high, urgent) and colour |
| FR-46 | Admin can select a department for an event |
| FR-47 | Admin can assign specific team members from that department to the event using checkboxes |
| FR-48 | When a new meeting is created and a department is selected, the system automatically sends email invitations to the selected members (or all department members if none are specifically selected) |
| FR-49 | Scheduled social media posts appear on the calendar automatically |
| FR-50 | Admin can edit and delete events |

### 4.9 Content Creator
| # | Requirement |
|---|---|
| FR-51 | Admin can create social media posts for clients across platforms: Twitter/X, Instagram, Facebook, LinkedIn, YouTube |
| FR-52 | Admin can use AI (Gemini 2.5 Flash Lite, with Groq as fallback) to generate post content based on client context |
| FR-53 | Posts have a status workflow: Draft → Pending Review → Approved → Posted |
| FR-54 | Admin can schedule posts for a specific date and time |
| FR-55 | Admin can send posts to Akhilesh Ji (final approver) for approval via email |
| FR-56 | The approval email contains Approve and Reject buttons |
| FR-57 | Admin can manage posts using a Grid Planner with drag-and-drop organisation by platform |

### 4.10 Messaging Bank
| # | Requirement |
|---|---|
| FR-58 | Admin can save and manage reusable messaging templates |
| FR-59 | Templates can be browsed and copied when creating content |

### 4.11 Messages (Admin Chat)
| # | Requirement |
|---|---|
| FR-60 | Admin can send and receive messages with team members through an internal chat panel |

### 4.12 Settings
| # | Requirement |
|---|---|
| FR-61 | Admin can manage system-level settings from the Settings tab |

---

## 5. User Dashboard

### 5.1 My Clients
| # | Requirement |
|---|---|
| FR-62 | Regular users can view only the clients that have been shared with them by an admin |
| FR-63 | Users can view client details, assets, and AI chat scoped to each client |

### 5.2 Knowledge Base
| # | Requirement |
|---|---|
| FR-64 | Users can view published documents that belong to their department |
| FR-65 | Users can search documents by title, content, or tags |
| FR-66 | Users can open a full-screen view of any document |

### 5.3 Messages
| # | Requirement |
|---|---|
| FR-67 | Users can send and receive messages with admins through the internal chat panel |

### 5.4 Notifications
| # | Requirement |
|---|---|
| FR-68 | Users can view their notification history in the Notifications tab |

### 5.5 Profile
| # | Requirement |
|---|---|
| FR-69 | Users can view their own profile: name, email, department, and role |

---

## 6. Email Notifications

| # | Trigger | Recipient |
|---|---|---|
| FR-70 | Task assigned to a user | Assigned team member |
| FR-71 | Task reassigned to a different user | New assigned team member |
| FR-72 | Task status changed via kanban drag | Currently assigned team member |
| FR-73 | Meeting created with department selected | Selected members (or all dept members) |
| FR-74 | Content post sent for approval | Akhilesh Ji (final approver) |
| FR-75 | Approval reminder (time-based) | Akhilesh Ji |
| FR-76 | New user invited | Invited user (set-password link) |

All emails are sent from `noreply@anyasegen.com` via Resend using the Zoho Mail sending domain.

---

## 7. AI Features

| # | Requirement |
|---|---|
| FR-77 | Admin can chat with an AI assistant scoped to a specific client's context |
| FR-78 | Regular users have access to a general AI chat assistant |
| FR-79 | AI generates social media post content based on client name, platform, and tone |
| FR-80 | AI analyses client demographics and generates intelligence summaries |
| FR-81 | Primary AI: Google Gemini 2.5 Flash Lite. Fallback: Groq |

---

## 8. Access Control Rules

| Rule | Detail |
|---|---|
| AC-01 | Regular users cannot access the admin dashboard |
| AC-02 | Admin users cannot access the user dashboard |
| AC-03 | Users can only see documents from their own department |
| AC-04 | Users can only see clients explicitly shared with them |
| AC-05 | All data mutations (create, edit, delete) require authentication |
| AC-06 | Admin server actions use a service-role key — never exposed to the browser |

---

## 9. Non-Functional Requirements

| # | Requirement |
|---|---|
| NFR-01 | The application is fully responsive — works on mobile, tablet, and desktop |
| NFR-02 | All pages load within 3 seconds on a standard broadband connection |
| NFR-03 | Email notifications are delivered within 1 minute of the triggering action |
| NFR-04 | The system remains operational if the AI provider is temporarily unavailable (fallback logic) |
| NFR-05 | The application is deployed on Vercel for high availability |
| NFR-06 | All user passwords are managed by Supabase Auth — never stored in plain text |

---

*End of Functional Requirements — ANYA SEGEN CRM v1.0*
