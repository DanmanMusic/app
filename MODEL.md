# Data Model Specification (V2.1 - Schema-First Update)

This document provides the technical details of the database schema, generated directly from the live Supabase/PostgreSQL project. It outlines tables, columns, data types, relationships, custom types, and key business logic implemented in functions and triggers.

**Conventions:**

-   **Multi-Tenancy:** All company-specific data tables include a `company_id` foreign key for strict data isolation.
-   **Primary Keys (PK):** PKs are UUIDs by default, but some high-volume tables use BIGSERIAL (e.g., `ticket_transactions`, `practice_logs`).
-   **Foreign Keys (FK):** Relationships are enforced with Foreign Keys. `ON DELETE` actions (`CASCADE`, `SET NULL`) are specified based on desired data behavior.
-   **Timestamps:** The `handle_updated_at()` trigger is applied to all tables with an `updated_at` column to automatically manage it on update operations.
-   **Row Level Security (RLS):** RLS is enabled on **all** tables.
    -   Access is restricted to authenticated users within their own company.
    -   Permissions rely on custom `app_metadata` (`company_id`, `role`) injected into the user's JWT upon login by the `sync_profile_to_auth_user` trigger.
    -   Write operations are often handled by secure, `SECURITY DEFINER` Edge Functions or PostgreSQL functions.

## Custom Types (ENUMs)

These custom types define the allowed values for specific table columns.

-   **`public.announcement_type`**: `announcement`, `redemption_celebration`, `streak_milestone`
-   **`public.transaction_type`**: `task_award`, `manual_add`, `manual_subtract`, `redemption`, `streak_award`
-   **`public.verification_status`**: `pending`, `verified`, `partial`, `incomplete`
-   **`public.notification_status`**: `pending`, `sent`, `error`, `token_not_found`
-   **`public.notification_trigger_event`**: Defines the system event that caused a notification (e.g., `cron_staff_daily_briefing`, `task_verified`).

## Foundational Tables

**`companies`** (Core Table)

-   `id` (UUID, PK)
-   `name` (TEXT, NOT NULL, UNIQUE)
-   `timezone` (TEXT, NOT NULL): The IANA timezone name (e.g., `America/New_York`) for the company.
-   `created_at` (TIMESTAMPTZ, NOT NULL)

**`auth.users`** (Built-in Supabase Table)

-   `id` (UUID, PK)
-   `email` (TEXT)
-   `raw_app_meta_data` (JSONB): Automatically populated by a trigger with `company_id` and `role` for use in RLS policies.
-   ... other standard Supabase auth columns.

**`profiles`** (Stores public user data)

-   `id` (UUID, PK, FK -> `auth.users.id` ON DELETE CASCADE)
-   `company_id` (UUID, NOT NULL, FK -> `companies.id` ON DELETE CASCADE)
-   `role` (TEXT/ENUM('admin', 'teacher', 'student', 'parent'), NOT NULL)
-   `first_name` (TEXT, NOT NULL)
-   `last_name` (TEXT, NOT NULL)
-   `nickname` (TEXT, Nullable)
-   `avatar_path` (TEXT, Nullable): Path to the user's avatar in the `avatars` storage bucket.
-   `status` (TEXT/ENUM('active', 'inactive'), NOT NULL, default 'active')
-   `current_goal_reward_id` (UUID, Nullable, FK -> `rewards.id` ON DELETE SET NULL)
-   `created_at` (TIMESTAMPTZ, NOT NULL)
-   `updated_at` (TIMESTAMPTZ, NOT NULL)

## Custom Authentication Tables

**`onetime_pins`**

-   `pin` (TEXT, PK): The short-lived, plain-text PIN.
-   `company_id` (UUID, NOT NULL)
-   `user_id` (UUID, NOT NULL)
-   `target_role` (TEXT, NOT NULL)
-   `expires_at` (TIMESTAMPTZ, NOT NULL)
-   `claimed_at` (TIMESTAMPTZ, Nullable)
-   `created_at` (TIMESTAMPTZ, NOT NULL)

**`active_refresh_tokens`**

-   `id` (BIGSERIAL, PK)
-   `company_id` (UUID, NOT NULL)
-   `user_id` (UUID, NOT NULL)
-   `token_hash` (TEXT, NOT NULL, UNIQUE)
-   `expires_at` (TIMESTAMPTZ, NOT NULL)
-   `last_used_at` (TIMESTAMPTZ, Nullable)
-   `metadata` (JSONB, Nullable)
-   `created_at` (TIMESTAMPTZ, NOT NULL)

**`user_credentials`** (Legacy PIN Storage)
-   `user_id` (UUID, PK)
-   `company_id` (UUID, NOT NULL)
-   `pin_hash` (TEXT, Nullable): Hashed representation of a user's PIN.

## Core Application Data Tables

**`instruments`**

-   `id` (UUID, PK)
-   `company_id` (UUID, NOT NULL, FK -> `companies.id` ON DELETE CASCADE)
-   `name` (TEXT, NOT NULL)
-   `image_path` (TEXT, Nullable)
-   `created_at` (TIMESTAMPTZ, NOT NULL)
-   `updated_at` (TIMESTAMPTZ, NOT NULL)

**`rewards`**

-   `id` (UUID, PK)
-   `company_id` (UUID, NOT NULL, FK -> `companies.id` ON DELETE CASCADE)
-   `name` (TEXT, NOT NULL)
-   `cost` (INTEGER, NOT NULL, CHECK >= 0)
-   `image_path` (TEXT, Nullable)
-   `description` (TEXT, Nullable)
-   `is_goal_eligible` (BOOLEAN, NOT NULL, default `false`): If `true`, students can set this as a goal.
-   `created_at` (TIMESTAMPTZ, NOT NULL)
-   `updated_at` (TIMESTAMPTZ, NOT NULL)

**`journey_locations`** (New V2 Table)

-   `id` (UUID, PK)
-   `company_id` (UUID, NOT NULL, FK -> `companies.id` ON DELETE CASCADE)
-   `name` (TEXT, NOT NULL)
-   `description` (TEXT, Nullable)
-   `can_reassign_tasks` (BOOLEAN, NOT NULL, default `false`): If `false`, tasks from here are one-time completions.
-   `created_at` (TIMESTAMPTZ, NOT NULL)
-   `updated_at` (TIMESTAMPTZ, NOT NULL)
-   UNIQUE constraint on `(company_id, name)`.

**`task_library`**

-   `id` (UUID, PK)
-   `company_id` (UUID, NOT NULL, FK -> `companies.id` ON DELETE CASCADE)
-   `title` (TEXT, NOT NULL)
-   `description` (TEXT, Nullable)
-   `base_tickets` (INTEGER, NOT NULL, CHECK >= 0)
-   `created_by_id` (UUID, NOT NULL, FK -> `profiles.id` ON DELETE SET NULL)
-   `can_self_assign` (BOOLEAN, NOT NULL, default `false`): If `true`, students can assign this to themselves.
-   `journey_location_id` (UUID, Nullable, FK -> `journey_locations.id` ON DELETE SET NULL)
-   `created_at` (TIMESTAMPTZ, NOT NULL)
-   `updated_at` (TIMESTAMPTZ, NOT NULL)

**`assigned_tasks`**

-   `id` (UUID, PK)
-   `company_id` (UUID, NOT NULL)
-   `student_id` (UUID, NOT NULL)
-   `assigned_by_id` (UUID, NOT NULL)
-   `task_library_id` (UUID, Nullable, FK -> `task_library.id` ON DELETE SET NULL)
-   `task_title` (TEXT, NOT NULL)
-   `task_description` (TEXT, NOT NULL)
-   `task_base_points` (INTEGER, NOT NULL)
-   `task_links` (JSONB, Nullable): Snapshot of URLs at time of assignment.
-   `task_attachments` (JSONB, Nullable): Snapshot of attachments at time of assignment.
-   `is_complete` (BOOLEAN, NOT NULL, default `false`)
-   `completed_date` (TIMESTAMPTZ, Nullable)
-   `verification_status` (PUBLIC.verification_status ENUM, Nullable)
-   `verified_by_id` (UUID, Nullable)
-   `verified_date` (TIMESTAMPTZ, Nullable)
-   `actual_points_awarded` (INTEGER, Nullable)
-   `created_at` (TIMESTAMPTZ, NOT NULL)
-   `updated_at` (TIMESTAMPTZ, NOT NULL)

**`ticket_transactions`**

-   `id` (BIGSERIAL, PK)
-   `company_id` (UUID, NOT NULL)
-   `student_id` (UUID, NOT NULL)
-   `amount` (INTEGER, NOT NULL): The change in ticket balance (+/-).
-   `type` (PUBLIC.transaction_type ENUM, NOT NULL)
-   `source_id` (TEXT, Nullable): Identifier of the originating record (task, reward, etc.).
-   `notes` (TEXT, Nullable)
-   `description` (TEXT, Nullable): A user-facing description of the transaction.
-   `timestamp` (TIMESTAMPTZ, NOT NULL)

**`announcements`**

-   `id` (UUID, PK)
-   `company_id` (UUID, NOT NULL, FK -> `companies.id` ON DELETE CASCADE)
-   `type` (PUBLIC.announcement_type ENUM, NOT NULL)
-   `title` (TEXT, NOT NULL)
-   `message` (TEXT, NOT NULL)
-   `related_student_id` (UUID, Nullable, FK -> `profiles.id` ON DELETE SET NULL)
-   `date` (TIMESTAMPTZ, NOT NULL)
-   `created_at` (TIMESTAMPTZ, NOT NULL)
-   `updated_at` (TIMESTAMPTZ, NOT NULL)

## V2 Feature Tables

**`practice_logs`**

-   `id` (BIGSERIAL, PK)
-   `company_id` (UUID, NOT NULL, FK -> `companies.id` ON DELETE CASCADE)
-   `student_id` (UUID, NOT NULL, FK -> `profiles.id` ON DELETE CASCADE)
-   `log_date` (DATE, NOT NULL, default `now()`)
-   `created_at` (TIMESTAMPTZ, NOT NULL)
-   UNIQUE constraint on `(student_id, log_date)`.

**`push_tokens`**

-   `id` (BIGSERIAL, PK)
-   `company_id` (UUID, NOT NULL, FK -> `companies.id` ON DELETE CASCADE)
-   `user_id` (UUID, NOT NULL, FK -> `profiles.id` ON DELETE CASCADE)
-   `token` (TEXT, NOT NULL, UNIQUE): The Expo push token.
-   `created_at` (TIMESTAMPTZ, NOT NULL)

**`notification_log`**

-   `id` (BIGSERIAL, PK)
-   `company_id` (UUID, NOT NULL, FK -> `companies.id` ON DELETE CASCADE)
-   `recipient_profile_id` (UUID, NOT NULL, FK -> `profiles.id` ON DELETE CASCADE)
-   `push_token_used` (TEXT, Nullable): The token(s) the notification was sent to.
-   `trigger_event` (PUBLIC.notification_trigger_event, NOT NULL)
-   `title` (TEXT, NOT NULL)
-   `message` (TEXT, NOT NULL)
-   `data_payload` (JSONB, Nullable)
-   `status` (PUBLIC.notification_status, NOT NULL, default 'pending')
-   `provider_response` (JSONB, Nullable): The raw JSON response from the push service (e.g., Expo).
-   `created_at` (TIMESTAMPTZ, NOT NULL)

## Link Tables (Many-to-Many & One-to-Many)

**Standard M:M Link Tables**
-   `student_instruments` (student_id, instrument_id, created_at)
-   `student_teachers` (student_id, teacher_id, created_at)
-   `parent_students` (parent_id, student_id, created_at)

**Task Library 1:M Link Tables**
-   `task_library_instruments` (task_library_id, instrument_id, created_at)
-   `task_library_urls` (id, task_library_id, url, label, created_at)
-   `task_library_attachments` (id, task_library_id, file_path, file_name, created_at)

## Key Functions & Triggers

-   **`sync_profile_to_auth_user()`**: An `AFTER INSERT OR UPDATE` trigger on `profiles`. It copies the user's `role` and `company_id` into `auth.users.raw_app_meta_data`. This is critical for making RLS policies efficient.
-   **`handle_updated_at()`**: A standard `BEFORE UPDATE` trigger to set the `updated_at` column to `now()`.
-   **`handle_streak_milestone_announcement()`**: An `AFTER INSERT` trigger on `ticket_transactions`. When a transaction of type `streak_award` is created, this function automatically generates a `streak_milestone` announcement.
-   **`notify_teacher_on_task_complete()`**: An `AFTER UPDATE` trigger on `assigned_tasks`. When `is_complete` changes to `true`, it sends a push notification to linked teachers.
-   **`notify_family_on_task_verified()`**: An `AFTER UPDATE` trigger on `assigned_tasks`. When `verification_status` changes, it sends personalized push notifications to the student and their linked parents.