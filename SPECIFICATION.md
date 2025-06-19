# Danmans Virtual Ticket App - V2 Functional Specification

## 1. Overview & Architecture

This document outlines the functional requirements for the Danmans Virtual Ticket App, a **multi-tenant mobile application** designed to manage student rewards within music schools. The app caters to different user roles: **Admin**, **Teacher**, **Student**, and **Parent**, all operating within the scope of their specific **Company** (e.g., Danmans Music).

The application is built on a Supabase backend. Data fetching and state management are primarily handled using TanStack Query, interacting with defined API endpoints. Core operations are executed via secure Supabase Edge Functions, while data retrieval is protected by **company-aware Row Level Security (RLS)** policies.

The V2 system introduces several new engagement features, including **User Avatars**, **Practice Streaks**, and a **Journey/Self-Assignment** system, to create a more motivating and interactive experience.

## 2. Company & User Management

### 2.1. Multi-Tenancy

- **Core Concept:** The application is architected to support multiple, isolated companies. All data (users, rewards, tasks, etc.) is scoped by a `company_id`.
- **Data Isolation:** RLS policies strictly enforce that users can only view and interact with data belonging to their own company.

### 2.2. User Creation & Linking

- **Account Creation:** Performed exclusively by an **Admin**, who creates users _within their own company_.
- **User Linking:** Relationships (Student<->Teacher, Parent<->Student, etc.) can only be formed between users of the same company. This is enforced by database constraints and Edge Function logic.

### 2.3. User Avatars

- **Functionality:** All users with a direct profile view (**Admin, Teacher, Student**) can upload a personal avatar. The **Parent** role does not have this feature.
- **Implementation:** Users can upload, replace, or remove their avatar via the "Edit My Info" or "Edit User" modals. Avatars are stored in a private `avatars` storage bucket, with RLS policies ensuring users can only manage their own files.

## 3. Authentication & Session Management

- **Authentication (Standard):** Email/Password login remains for users who have set it up.
- **Authentication (PIN-Based):** The on-demand PIN generation flow remains a primary login method for Students, Parents, and Teachers.
- **JWT Claims:** Upon successful login (either method), the user's JWT is now populated with custom `app_metadata` containing their `role` and `company_id`. This information is used by database RLS policies to enforce permissions without requiring extra database lookups.
- **Session Management:** The custom PIN-based refresh token flow remains the same.

## 4. Core V2 Features by Role

### 4.1. Admin

- **Journey Location Management:** Admins have full CRUD (Create, Read, Update, Delete) capabilities over **Journey Locations**, which act as categories for self-assignable tasks.
- **Task Library Configuration:** When creating or editing a Task Library Item, an Admin can:
  - Toggle a boolean flag: `can_self_assign`.
  - If `can_self_assign` is true, they **must** assign the task to a **Journey Location**.

### 4.2. Student

- **Practice Streaks:**
  - The `StudentView` dashboard now features a **Practice Streak Tracker**.
  - Students can press an "I Practiced Today!" button once per day to log their practice.
  - The UI displays their current consecutive day streak.
  - **Automated Rewards:** Hitting a 7-day streak milestone (7, 14, 21, etc.) automatically awards bonus tickets via a server-side function.
- **Self-Assignable Tasks (The Journey):**
  - The `StudentView` will feature a "Journey" or "Available Tasks" section.
  - This section displays available `task_library` items where `can_self_assign` is true, grouped by their **Journey Location**.
  - A student can have only **one active, incomplete task per Journey Location** at a time.
  - They can "Assign to Me," which creates a new entry for them in `assigned_tasks`.
- **Goal Setting:**
  - When setting a goal, the list of available rewards in the `SetGoalModal` is now filtered to only show items where `is_goal_eligible` is true.

### 4.3. Enriched Announcements

- **Display:** The `AnnouncementListItem` component is now capable of displaying a related student's avatar and name, making system-generated "Redemption Celebration" announcements more personal and engaging.

## 5. Notifications (Infrastructure)

- **System Foundation:** The V2 backend includes the necessary tables (`push_tokens`) and a core Edge Function (`send-notification`) to support sending push notifications via Expo's services.
- **Scheduled Notifications:** The V2 backend implements a robust, multi-tenant, and timezone-aware scheduled notification system using `pg_cron`. The system dispatches three distinct daily notifications:

- **Admin Daily Briefing (9 AM Local Time):** A company-wide summary sent to all active Admins, detailing the previous day's completed tasks, redeemed rewards, and practice logs, as well as a count of currently pending task verifications.
- **Teacher Daily Briefing (9 AM Local Time):** A personalized summary sent to each active Teacher, detailing the same metrics but scoped exclusively to their own linked students.
- **Practice Streak Reminder (3 PM Local Time):** A personalized reminder sent to Students with an active streak who have not yet logged practice for the day. A consolidated version is sent to linked Parents, listing all their children who need a reminder.

- **Event-Driven Notifications:** The system also includes triggers that send immediate push notifications for key events, such as when a student marks a task as complete (`task_needs_verification`) or when a task is verified by staff (`task_verified`).

## 6. Pending Decisions (for V3 and beyond)

- **Visual Music Journey:** The implementation of the visual poster map, with interactive, unlockable locations based on student progress, is deferred.
- **Parent Reminders:** Specific parent-initiated reminder functionality is deferred.
- **Further Event-Driven Notifications:** While core event notifications for the task lifecycle (`task_needs_verification`, `task_verified`) are implemented, a wider suite of events (e.g., "New Reward Added," "Challenge Starting Soon") is deferred to a future version.
