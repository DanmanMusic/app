# Data Model Specification (Target: Supabase/PostgreSQL)

This document provides the technical details of the database schema intended for use with Supabase/PostgreSQL. It outlines tables, columns, data types, relationships, and constraints.

**Conventions:**
*   Primary Keys (PK) are typically UUIDs unless otherwise noted.
*   Foreign Keys (FK) enforce relationships between tables. `ON DELETE CASCADE` or other actions should be considered where appropriate.
*   Timestamps (`created_at`, `updated_at`) use `TIMESTAMPTZ` with default values (`now()`). `updated_at` usually requires a trigger for automatic updates.
*   TEXT/ENUM types should be chosen based on the specific constraints needed.
*   Fields marked `TBD` or `Decision Pending` require confirmation before final implementation.
*   Row Level Security (RLS) policies are essential for security and will be defined separately based on these tables.

## Core Authentication & Profile Tables

**`auth.users`** (Built-in Supabase Table)
*   `id` (UUID, PK): Core user identifier.
*   `email` (TEXT): User's email (if used for login/recovery).
*   ... other standard Supabase auth columns (`encrypted_password`, etc.)

**`profiles`** (Stores public user data, linked 1-to-1 with `auth.users`)
*   `id` (UUID, PK, FK -> `auth.users.id` ON DELETE CASCADE)
*   `role` (TEXT/ENUM('admin', 'teacher', 'student', 'parent'), NOT NULL)
*   `first_name` (TEXT, NOT NULL)
*   `last_name` (TEXT, NOT NULL)
*   `nickname` (TEXT, Nullable)
*   `status` (TEXT/ENUM('active', 'inactive'), NOT NULL, default 'active')
*   `created_at` (TIMESTAMPTZ, default `now()`, NOT NULL)
*   `updated_at` (TIMESTAMPTZ, default `now()`, NOT NULL)
*   **Potential Field (TBD):** `avatar_path` (TEXT, Nullable): Path for avatar in Supabase Storage. *Decision Pending: Implement avatars? Which roles?*

**`user_credentials`** (Stores specific credential info, like PINs)
*   `user_id` (UUID, PK, FK -> `profiles.id` ON DELETE CASCADE): The user this credential belongs to.
*   `pin_hash` (TEXT, NOT NULL): Securely hashed PIN. *(Constraint: Should likely only exist if `profiles.role = 'student'`)*.

## Application Data Tables

**`instruments`**
*   `id` (UUID, PK)
*   `name` (TEXT, NOT NULL, UNIQUE)
*   `created_at` (TIMESTAMPTZ, default `now()`, NOT NULL)
*   `updated_at` (TIMESTAMPTZ, default `now()`, NOT NULL)
*   **Potential Field (TBD):** `image_path` (TEXT, Nullable): Path for icon in Supabase Storage. *Decision Pending: Store images or use hardcoded?*

**`task_library`**
*   `id` (UUID, PK)
*   `title` (TEXT, NOT NULL)
*   `description` (TEXT, Nullable): *Decision Pending: Necessity?*
*   `base_tickets` (INTEGER, NOT NULL, CHECK >= 0)
*   `created_at` (TIMESTAMPTZ, default `now()`, NOT NULL)
*   `updated_at` (TIMESTAMPTZ, default `now()`, NOT NULL)
*   **Potential Field (TBD):** `link_url` (TEXT, Nullable): Optional external link. *Decision Pending: Implement?*

**`rewards`**
*   `id` (UUID, PK)
*   `name` (TEXT, NOT NULL)
*   `cost` (INTEGER, NOT NULL, CHECK >= 0)
*   `image_path` (TEXT, Nullable): Path for image in Supabase Storage. *Decision Pending: Mandatory?*
*   `description` (TEXT, Nullable): *Decision Pending: Necessity?*
*   `created_at` (TIMESTAMPTZ, default `now()`, NOT NULL)
*   `updated_at` (TIMESTAMPTZ, default `now()`, NOT NULL)

**`assigned_tasks`**
*   `id` (UUID, PK)
*   `student_id` (UUID, NOT NULL, FK -> `profiles.id` ON DELETE SET NULL or CASCADE - *Decision Pending*)
*   `assigned_by_id` (UUID, NOT NULL, FK -> `profiles.id` ON DELETE SET NULL)
*   `assigned_date` (TIMESTAMPTZ, NOT NULL, default `now()`)
*   `task_title` (TEXT, NOT NULL)
*   `task_description` (TEXT, NOT NULL)
*   `task_base_points` (INTEGER, NOT NULL, CHECK >= 0)
*   `is_complete` (BOOLEAN, NOT NULL, default false)
*   `completed_date` (TIMESTAMPTZ, Nullable)
*   `verification_status` (TEXT/ENUM('pending', 'verified', 'partial', 'incomplete'), Nullable)
*   `verified_by_id` (UUID, Nullable, FK -> `profiles.id` ON DELETE SET NULL)
*   `verified_date` (TIMESTAMPTZ, Nullable)
*   `actual_points_awarded` (INTEGER, Nullable, CHECK >= 0)
*   `created_at` (TIMESTAMPTZ, default `now()`, NOT NULL)
*   `updated_at` (TIMESTAMPTZ, default `now()`, NOT NULL)
*   **Potential Field (TBD):** `task_link_url` (TEXT, Nullable): Optional link for this specific assignment. *Decision Pending: Implement task links?*
*   **Potential Field (TBD):** `source_challenge_id` (UUID, Nullable, FK -> `challenges.id` ON DELETE SET NULL): *Needed only if Challenges are implemented*.

**`ticket_transactions`**
*   `id` (BIGSERIAL, PK) or (UUID, PK) - *BIGSERIAL is simpler for ordering.*
*   `student_id` (UUID, NOT NULL, FK -> `profiles.id` ON DELETE SET NULL or CASCADE - *Decision Pending*)
*   `timestamp` (TIMESTAMPTZ, NOT NULL, default `now()`)
*   `amount` (INTEGER, NOT NULL)
*   `type` (TEXT/ENUM('task_award', 'manual_add', 'manual_subtract', 'redemption'), NOT NULL)
*   `source_id` (TEXT, Nullable): ID of related record (e.g., `assigned_tasks.id`, `rewards.id`, `profiles.id` of adjustor).
*   `notes` (TEXT, Nullable)

**`announcements`**
*   `id` (UUID, PK)
*   `type` (TEXT/ENUM('announcement', 'challenge', 'redemption_celebration'), NOT NULL): *Decision Pending: Review types*.
*   `title` (TEXT, NOT NULL)
*   `message` (TEXT, NOT NULL): *Decision Pending: Confirm requirement*.
*   `date` (TIMESTAMPTZ, NOT NULL, default `now()`)
*   `related_student_id` (UUID, Nullable, FK -> `profiles.id` ON DELETE SET NULL): *Decision Pending: Confirm usage*.
*   `created_at` (TIMESTAMPTZ, default `now()`, NOT NULL)
*   `updated_at` (TIMESTAMPTZ, default `now()`, NOT NULL)

**`challenges`** (Potential New Table - TBD)
*   *Decision Pending:* Implement Challenge feature?
*   If Yes, proposed fields:
    *   `id` (UUID, PK)
    *   `title` (TEXT, NOT NULL)
    *   `description` (TEXT, NOT NULL)
    *   `base_tickets` (INTEGER, NOT NULL, CHECK >= 0)
    *   `link_url?` (TEXT, Nullable): *Decision Pending: Task links?*
    *   `created_by_id` (UUID, NOT NULL, FK -> `profiles.id` ON DELETE SET NULL)
    *   `target_instrument_id?` (UUID, Nullable, FK -> `instruments.id` ON DELETE SET NULL)
    *   `target_teacher_id?` (UUID, Nullable, FK -> `profiles.id` ON DELETE SET NULL)
    *   `is_global` (BOOLEAN, NOT NULL, default false)
    *   `is_active` (BOOLEAN, NOT NULL, default true)
    *   `expiry_date?` (DATE, Nullable): *Decision Pending: Needed?*
    *   `created_at` (TIMESTAMPTZ, default `now()`, NOT NULL)
    *   `updated_at` (TIMESTAMPTZ, default `now()`, NOT NULL)

## Link Tables (for Many-to-Many Relationships)

**`student_instruments`**
*   `student_id` (UUID, PK, FK -> `profiles.id` ON DELETE CASCADE)
*   `instrument_id` (UUID, PK, FK -> `instruments.id` ON DELETE CASCADE)
*   `created_at` (TIMESTAMPTZ, default `now()`, NOT NULL)

**`student_teachers`**
*   `student_id` (UUID, PK, FK -> `profiles.id` ON DELETE CASCADE)
*   `teacher_id` (UUID, PK, FK -> `profiles.id` ON DELETE CASCADE) - *(Constraint: Check `profiles.role = 'teacher'` for `teacher_id`)*
*   `created_at` (TIMESTAMPTZ, default `now()`, NOT NULL)

**`parent_students`**
*   `parent_id` (UUID, PK, FK -> `profiles.id` ON DELETE CASCADE) - *(Constraint: Check `profiles.role = 'parent'` for `parent_id`)*
*   `student_id` (UUID, PK, FK -> `profiles.id` ON DELETE CASCADE) - *(Constraint: Check `profiles.role = 'student'` for `student_id`)*
*   `created_at` (TIMESTAMPTZ, default `now()`, NOT NULL)

## Relationships Summary

*   `auth.users` 1-to-1 `profiles` (via `profiles.id`)
*   `profiles` 1-to-many `assigned_tasks` (via `student_id`, `assigned_by_id`, `verified_by_id`)
*   `profiles` 1-to-many `ticket_transactions` (via `student_id`)
*   `profiles` 1-to-many `announcements` (via `related_student_id`)
*   `profiles` 1-to-1 `user_credentials` (via `user_id`)
*   `profiles` many-to-many `instruments` (via `student_instruments` link table)
*   `profiles` many-to-many `profiles` (Students <-> Teachers via `student_teachers` link table)
*   `profiles` many-to-many `profiles` (Parents <-> Students via `parent_students` link table)
*   `rewards` 1-to-many `ticket_transactions` (conceptually, via `source_id` when `type='redemption'`)
*   `assigned_tasks` 1-to-many `ticket_transactions` (conceptually, via `source_id` when `type='task_award'`)
*   (TBD) `challenges` 1-to-many `assigned_tasks` (via `source_challenge_id`)