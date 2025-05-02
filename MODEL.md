# Data Model Specification (Target: Supabase/PostgreSQL)

This document provides the technical details of the database schema intended for use with Supabase/PostgreSQL. It outlines tables, columns, data types, relationships, and constraints based on the implemented features and decisions made during development.

**Conventions:**

- Primary Keys (PK) are typically UUIDs unless otherwise noted (e.g., `BIGSERIAL` for `ticket_transactions`).
- Foreign Keys (FK) enforce relationships between tables. `ON DELETE CASCADE` and `ON DELETE SET NULL` actions are specified based on desired data retention upon user deletion.
- Timestamps (`created_at`, `updated_at`) use `TIMESTAMPTZ` with default values (`now()`). `updated_at` requires a trigger (e.g., `handle_updated_at()`) for automatic updates.
- TEXT/ENUM types are used as appropriate.
- Row Level Security (RLS) policies are essential and defined in the corresponding migration files or separate SQL files. Most write operations are handled via secured Edge Functions.

## Core Authentication & Profile Tables

**`auth.users`** (Built-in Supabase Table)

- `id` (UUID, PK): Core user identifier.
- `email` (TEXT): User's email (used for email/password login, often placeholder for PIN-only users).
- ... other standard Supabase auth columns (`encrypted_password`, etc.)

**`profiles`** (Stores public user data, linked 1-to-1 with `auth.users`)

- `id` (UUID, PK, FK -> `auth.users.id` ON DELETE CASCADE)
- `role` (TEXT/ENUM('admin', 'teacher', 'student', 'parent'), NOT NULL)
- `first_name` (TEXT, NOT NULL)
- `last_name` (TEXT, NOT NULL)
- `nickname` (TEXT, Nullable)
- `status` (TEXT/ENUM('active', 'inactive'), NOT NULL, default 'active')
- `current_goal_reward_id` (UUID, Nullable, FK -> `rewards.id` ON DELETE SET NULL)
- `created_at` (TIMESTAMPTZ, default `now()`, NOT NULL)
- `updated_at` (TIMESTAMPTZ, default `now()`, NOT NULL)

**`user_credentials`** (Stores specific credential info - Currently Legacy/Unused)

- `user_id` (UUID, PK, FK -> `profiles.id` ON DELETE CASCADE)
- `pin_hash` (TEXT, Nullable): _Legacy field for storing hashed PINs. Not used by the current on-demand PIN flow._

**`onetime_pins`** (Stores temporary PINs for login)

- `pin` (TEXT, PK): The short-lived, plain-text PIN.
- `user_id` (UUID, NOT NULL, FK -> `profiles.id` ON DELETE CASCADE)
- `target_role` (TEXT, NOT NULL, CHECK (`target_role` IN ('student', 'parent', 'teacher', 'admin')))
- `expires_at` (TIMESTAMPTZ, NOT NULL)
- `created_at` (TIMESTAMPTZ, default `now()`, NOT NULL)
- `claimed_at` (TIMESTAMPTZ, Nullable)

**`active_refresh_tokens`** (Stores hashes for custom refresh tokens)

- `id` (BIGSERIAL, PK)
- `user_id` (UUID, NOT NULL, FK -> `profiles.id` ON DELETE CASCADE)
- `token_hash` (TEXT, NOT NULL, UNIQUE)
- `expires_at` (TIMESTAMPTZ, NOT NULL)
- `created_at` (TIMESTAMPTZ, default `now()`, NOT NULL)
- `last_used_at` (TIMESTAMPTZ, Nullable)
- `metadata` (JSONB, Nullable)

## Application Data Tables

**`instruments`**

- `id` (UUID, PK)
- `name` (TEXT, NOT NULL, UNIQUE)
- `image_path` (TEXT, Nullable): Path for icon in Supabase Storage (`instrument-icons` bucket).
- `created_at` (TIMESTAMPTZ, default `now()`, NOT NULL)
- `updated_at` (TIMESTAMPTZ, default `now()`, NOT NULL)

**`task_library`**

- `id` (UUID, PK)
- `title` (TEXT, NOT NULL)
- `description` (TEXT, Nullable)
- `base_tickets` (INTEGER, NOT NULL, CHECK >= 0)
- `created_at` (TIMESTAMPTZ, default `now()`, NOT NULL)
- `updated_at` (TIMESTAMPTZ, default `now()`, NOT NULL)
- `link_url` (TEXT, Nullable): _Optional field if task links are implemented later._

**`rewards`**

- `id` (UUID, PK)
- `name` (TEXT, NOT NULL)
- `cost` (INTEGER, NOT NULL, CHECK >= 0)
- `image_path` (TEXT, Nullable): Path for image in Supabase Storage (`reward-icons` bucket).
- `description` (TEXT, Nullable)
- `created_at` (TIMESTAMPTZ, default `now()`, NOT NULL)
- `updated_at` (TIMESTAMPTZ, default `now()`, NOT NULL)

**`assigned_tasks`**

- `id` (UUID, PK)
- `student_id` (UUID, NOT NULL, FK -> `profiles.id` ON DELETE CASCADE)
- `assigned_by_id` (UUID, NOT NULL, FK -> `profiles.id` ON DELETE SET NULL)
- `assigned_date` (TIMESTAMPTZ, NOT NULL, default `now()`)
- `task_title` (TEXT, NOT NULL)
- `task_description` (TEXT, NOT NULL)
- `task_base_points` (INTEGER, NOT NULL, CHECK >= 0)
- `is_complete` (BOOLEAN, NOT NULL, default false)
- `completed_date` (TIMESTAMPTZ, Nullable)
- `verification_status` (PUBLIC.verification_status ENUM('pending', 'verified', 'partial', 'incomplete'), Nullable)
- `verified_by_id` (UUID, Nullable, FK -> `profiles.id` ON DELETE SET NULL)
- `verified_date` (TIMESTAMPTZ, Nullable)
- `actual_points_awarded` (INTEGER, Nullable, CHECK >= 0)
- `created_at` (TIMESTAMPTZ, default `now()`, NOT NULL)
- `updated_at` (TIMESTAMPTZ, default `now()`, NOT NULL)
- `task_link_url` (TEXT, Nullable): _Optional field if task links are implemented later._
- `source_challenge_id` (UUID, Nullable): _Needed only if Challenges are implemented later._

**`ticket_transactions`**

- `id` (BIGSERIAL, PK)
- `student_id` (UUID, NOT NULL, FK -> `profiles.id` ON DELETE CASCADE)
- `timestamp` (TIMESTAMPTZ, NOT NULL, default `now()`)
- `amount` (INTEGER, NOT NULL)
- `type` (PUBLIC.transaction_type ENUM('task_award', 'manual_add', 'manual_subtract', 'redemption'), NOT NULL)
- `source_id` (TEXT, Nullable): ID of related record (e.g., `assigned_tasks.id`, `rewards.id`, `profiles.id` of adjustor).
- `notes` (TEXT, Nullable)

**`announcements`**

- `id` (UUID, PK)
- `type` (PUBLIC.announcement_type ENUM('announcement', 'challenge', 'redemption_celebration'), NOT NULL)
- `title` (TEXT, NOT NULL)
- `message` (TEXT, NOT NULL)
- `date` (TIMESTAMPTZ, NOT NULL, default `now()`)
- `related_student_id` (UUID, Nullable, FK -> `profiles.id` ON DELETE SET NULL)
- `created_at` (TIMESTAMPTZ, default `now()`, NOT NULL)
- `updated_at` (TIMESTAMPTZ, default `now()`, NOT NULL)

## Link Tables (for Many-to-Many Relationships)

**`student_instruments`**

- `student_id` (UUID, PK, FK -> `profiles.id` ON DELETE CASCADE)
- `instrument_id` (UUID, PK, FK -> `instruments.id` ON DELETE CASCADE)
- `created_at` (TIMESTAMPTZ, default `now()`, NOT NULL)

**`student_teachers`**

- `student_id` (UUID, PK, FK -> `profiles.id` ON DELETE CASCADE)
- `teacher_id` (UUID, PK, FK -> `profiles.id` ON DELETE CASCADE)
- `created_at` (TIMESTAMPTZ, default `now()`, NOT NULL)

**`parent_students`**

- `parent_id` (UUID, PK, FK -> `profiles.id` ON DELETE CASCADE)
- `student_id` (UUID, PK, FK -> `profiles.id` ON DELETE CASCADE)
- `created_at` (TIMESTAMPTZ, default `now()`, NOT NULL)

## Relationships Summary (Including Foreign Key Actions)

- `auth.users` 1-to-1 `profiles` (via `profiles.id` FK -> `auth.users.id` ON DELETE CASCADE)
- `profiles` 1-to-many `assigned_tasks`
    - `assigned_tasks.student_id` FK -> `profiles.id` ON DELETE CASCADE
    - `assigned_tasks.assigned_by_id` FK -> `profiles.id` ON DELETE SET NULL
    - `assigned_tasks.verified_by_id` FK -> `profiles.id` ON DELETE SET NULL
- `profiles` 1-to-many `ticket_transactions`
    - `ticket_transactions.student_id` FK -> `profiles.id` ON DELETE CASCADE
- `profiles` 1-to-many `announcements`
    - `announcements.related_student_id` FK -> `profiles.id` ON DELETE SET NULL
- `profiles` 1-to-1 `user_credentials`
    - `user_credentials.user_id` FK -> `profiles.id` ON DELETE CASCADE
- `profiles` 1-to-many `onetime_pins`
    - `onetime_pins.user_id` FK -> `profiles.id` ON DELETE CASCADE
- `profiles` 1-to-many `active_refresh_tokens`
    - `active_refresh_tokens.user_id` FK -> `profiles.id` ON DELETE CASCADE
- `profiles` many-to-many `instruments` (via `student_instruments`)
    - `student_instruments.student_id` FK -> `profiles.id` ON DELETE CASCADE
    - `student_instruments.instrument_id` FK -> `instruments.id` ON DELETE CASCADE
- `profiles` many-to-many `profiles` (Students <-> Teachers via `student_teachers`)
    - `student_teachers.student_id` FK -> `profiles.id` ON DELETE CASCADE
    - `student_teachers.teacher_id` FK -> `profiles.id` ON DELETE CASCADE
- `profiles` many-to-many `profiles` (Parents <-> Students via `parent_students`)
    - `parent_students.parent_id` FK -> `profiles.id` ON DELETE CASCADE
    - `parent_students.student_id` FK -> `profiles.id` ON DELETE CASCADE
- `rewards` 1-to-many `profiles` (for goals)
    - `profiles.current_goal_reward_id` FK -> `rewards.id` ON DELETE SET NULL
- `rewards` conceptually linked to `ticket_transactions` (via `source_id` when `type='redemption'`)
- `assigned_tasks` conceptually linked to `ticket_transactions` (via `source_id` when `type='task_award'`)