# Data Model Specification (V2 - Multi-Tenant)

This document provides the technical details of the database schema intended for use with Supabase/PostgreSQL. It outlines tables, columns, data types, relationships, and constraints for the multi-tenant V2 application.

**Conventions:**

-   All company-specific data tables now include a `company_id` foreign key.
-   Primary Keys (PK) are UUIDs unless otherwise noted.
-   Foreign Keys (FK) enforce relationships. `ON DELETE` actions (`CASCADE`, `SET NULL`) are specified based on desired data behavior.
-   The `handle_updated_at()` trigger function is assumed to be applied to all tables with an `updated_at` column.
-   Row Level Security (RLS) is enabled on all tables. Public read access is granted explicitly where needed; otherwise, access is restricted to authenticated users within their own company, with write operations often handled by secure Edge Functions.

## Foundational Tables

**`companies`** (New Core Table)

-   `id` (UUID, PK)
-   `name` (TEXT, NOT NULL, UNIQUE)
-   `created_at` (TIMESTAMPTZ, NOT NULL)

**`auth.users`** (Built-in Supabase Table)

-   `id` (UUID, PK)
-   `email` (TEXT)
-   `raw_app_meta_data` (JSONB): Now automatically populated by a trigger with `company_id` and `role` for use in JWT-based RLS policies.
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

-   `pin` (TEXT, PK)
-   `company_id` (UUID, NOT NULL, FK -> `companies.id` ON DELETE CASCADE)
-   `user_id` (UUID, NOT NULL, FK -> `profiles.id` ON DELETE CASCADE)
-   `target_role` (TEXT, NOT NULL)
-   `expires_at` (TIMESTAMPTZ, NOT NULL)
-   `claimed_at` (TIMESTAMPTZ, Nullable)

**`active_refresh_tokens`**

-   `id` (BIGSERIAL, PK)
-   `company_id` (UUID, NOT NULL, FK -> `companies.id` ON DELETE CASCADE)
-   `user_id` (UUID, NOT NULL, FK -> `profiles.id` ON DELETE CASCADE)
-   `token_hash` (TEXT, NOT NULL, UNIQUE)
-   `expires_at` (TIMESTAMPTZ, NOT NULL)
-   `last_used_at` (TIMESTAMPTZ, Nullable)

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
-   `is_goal_eligible` (BOOLEAN, NOT NULL, default false): If `true`, students can set this as a goal.
-   `created_at` (TIMESTAMPTZ, NOT NULL)
-   `updated_at` (TIMESTAMPTZ, NOT NULL)

**`journey_locations`** (New V2 Table)

-   `id` (UUID, PK)
-   `company_id` (UUID, NOT NULL, FK -> `companies.id` ON DELETE CASCADE)
-   `name` (TEXT, NOT NULL)
-   `description` (TEXT, Nullable)
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
-   `attachment_path` (TEXT, Nullable)
-   `reference_url` (TEXT, Nullable)
-   `can_self_assign` (BOOLEAN, NOT NULL, default false): If `true`, students can assign this to themselves.
-   `journey_location_id` (UUID, Nullable, FK -> `journey_locations.id` ON DELETE SET NULL): The category for self-assignable tasks.
-   `created_at` (TIMESTAMPTZ, NOT NULL)
-   `updated_at` (TIMESTAMPTZ, NOT NULL)

**`assigned_tasks`**

-   `id` (UUID, PK)
-   `company_id` (UUID, NOT NULL, FK -> `companies.id` ON DELETE CASCADE)
-   `student_id` (UUID, NOT NULL, FK -> `profiles.id` ON DELETE CASCADE)
-   `assigned_by_id` (UUID, NOT NULL, FK -> `profiles.id` ON DELETE SET NULL)
-   `task_title` (TEXT, NOT NULL)
-   `verification_status` (PUBLIC.verification_status ENUM, Nullable)
-   ... other columns ...

**`ticket_transactions`**

-   `id` (BIGSERIAL, PK)
-   `company_id` (UUID, NOT NULL, FK -> `companies.id` ON DELETE CASCADE)
-   `student_id` (UUID, NOT NULL, FK -> `profiles.id` ON DELETE CASCADE)
-   `type` (PUBLIC.transaction_type ENUM, NOT NULL): Now includes `streak_award`.
-   ... other columns ...

**`announcements`**

-   `id` (UUID, PK)
-   `company_id` (UUID, NOT NULL, FK -> `companies.id` ON DELETE CASCADE)
-   `related_student_id` (UUID, Nullable, FK -> `profiles.id` ON DELETE SET NULL)
-   ... other columns ...

## V2 Feature Tables

**`practice_logs`** (New V2 Table)

-   `id` (BIGSERIAL, PK)
-   `company_id` (UUID, NOT NULL, FK -> `companies.id` ON DELETE CASCADE)
-   `student_id` (UUID, NOT NULL, FK -> `profiles.id` ON DELETE CASCADE)
-   `log_date` (DATE, NOT NULL, default `now()`)
-   `created_at` (TIMESTAMPTZ, NOT NULL)
-   UNIQUE constraint on `(student_id, log_date)`.

**`push_tokens`** (New V2 Table)

-   `id` (BIGSERIAL, PK)
-   `company_id` (UUID, NOT NULL, FK -> `companies.id` ON DELETE CASCADE)
-   `user_id` (UUID, NOT NULL, FK -> `profiles.id` ON DELETE CASCADE)
-   `token` (TEXT, NOT NULL, UNIQUE)
-   `created_at` (TIMESTAMPTZ, NOT NULL)

## Link Tables (for Many-to-Many Relationships)

**`student_instruments`**
**`student_teachers`**
**`parent_students`**
**`task_library_instruments`**

-   These tables remain structurally the same but are now implicitly scoped by the `company_id` of the profiles they link. RLS policies enforce that links can only be made between users of the same company.