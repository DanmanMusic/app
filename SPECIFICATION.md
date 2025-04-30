# Danmans Virtual Ticket App - Functional Specification

## 1. Overview

This document outlines the functional requirements for the Danmans Virtual Ticket App, a mobile application designed to manage student rewards using a virtual ticket system within a music school or similar educational setting. The app caters to different user roles: **Admin**, **Teacher**, **Student**, and **Parent**. Data fetching and state management are primarily handled using TanStack Query, interacting with defined API endpoints that trigger secure Supabase Edge Functions for core operations and rely on Supabase's REST API (protected by Row Level Security) for data retrieval.

The primary goal is to provide an engaging system for students to track progress and earn virtual tickets redeemable for rewards, complementing the physical ticket system. Key features include virtual ticket tracking, task assignment/completion/verification, a rewards catalog, transaction history, and announcements.

Future considerations, pending discussion and decisions, include features like parent-initiated reminders, enhanced task linking, user avatars, and the implementation of distinct "Challenges" alongside assigned tasks (See Section 10: Pending Decisions & Section 11: Potential Future Enhancements).

## 2. User Creation, Linking, and Authentication

- **Account Creation:** Exclusively performed by the **Admin** role via a secure Admin interface, invoking the `createUser` Supabase Edge Function. Admin creates accounts for **Admin**, **Teacher**, and **Student** users (creating entries in both `auth.users` and `profiles`). Requires first name, last name, role selection. Nickname is optional. For Students, Admin can link initial Teacher(s) and Instrument(s) via the `updateUserWithLinks` Edge Function. **Initial PINs are not set at creation; they are generated on demand.**
- **User Linking:** Relationships (Student<->Teacher, Student<->Instrument, Parent<->Student) are managed via **link tables** (`student_teachers`, `student_instruments`, `parent_students`). Admin manages Teacher/Instrument/Parent links via the Admin UI, invoking the `updateUserWithLinks` Edge Function or potentially dedicated linking functions.
- **User Deactivation/Deletion (Admin Action):**
  - **Deactivation/Reactivation:** Managed via the Admin interface, invoking the `toggleUserStatus` Supabase Edge Function (which updates `profiles.status`). Deactivation sets `status` to `'inactive'`, preventing login and filtering user from active lists. Reactivation sets status to `'active'`. Links persist during deactivation.
  - **Permanent Deletion:** Managed via the Admin interface, invoking the `deleteUser` Supabase Edge Function. This function performs authorization checks (caller is Admin, not deleting self, not deleting protected Admins) and calls `auth.admin.deleteUser`. Deletion relies on **database `ON DELETE CASCADE` rules** set on foreign keys referencing `profiles.id` to remove associated data (profile, credentials, links, potentially tasks/history depending on FK setup).
- **Authentication (Admin/Teacher - Standard):**
  - Login via a dedicated secure mechanism (e.g., email/password) managed by Supabase Auth. Requires a distinct login interface section. Uses standard `supabase.auth.signInWithPassword`. Backend returns standard Supabase JWT session upon success. Session refresh handled automatically by the Supabase client library. Credentials can be updated via the `updateAuthCredentials` Edge Function.
- **Authentication (Student/Parent/Teacher/Admin - PIN-Based):**
  - **PIN Generation & Management:** A short-lived, one-time numerical PIN (e.g., 6 digits) is generated **on demand** by an **Admin** or a **Teacher** via their UI, invoking the `generate-onetime-pin` Supabase Edge Function. This function requires the target user ID and the intended `targetRole` ('student', 'parent', 'teacher', or 'admin') the user will assume upon claiming the PIN. PINs are stored temporarily and securely in the `onetime_pins` table. _There is no persistent PIN stored for users._
  - **Login Flow (PIN):**
    1.  The mobile app presents a login screen section requesting the numerical PIN. (**Decision Pending:** How is the target user identified if multiple users might use PINs? For Student/Parent, the PIN implicitly links to a user via the `onetime_pins` table. For Teacher/Admin PIN login, how is the user specified?).
    2.  User enters the PIN.
    3.  App calls the `claim-onetime-pin` Supabase Edge Function, sending the plain-text PIN.
    4.  The Edge Function:
        - Validates the PIN against the `onetime_pins` table (checks existence, expiry, claimed status).
        - Retrieves the associated `user_id` and `target_role`.
        - Marks the PIN as claimed in the database.
        - Generates a **custom JWT access token** signed with a server-side secret (`CLIENT_JWT_SECRET`). The JWT payload includes standard claims (`sub`, `aud`, `exp`) and `app_metadata` containing the `role` (matching the `target_role` from the PIN record) and, if `targetRole` is 'parent', the `viewing_student_id` (set to the student's ID).
        - Generates an **opaque refresh token** and stores its hash securely in the `active_refresh_tokens` table.
        - Returns the access token, refresh token, user ID, and effective role to the app.
    5.  **App Handling (on Success):**
        - Stores the received **custom refresh token** securely using the `storageHelper` (`SecureStore` on native, `localStorage` on web).
        - Uses `supabase.auth.setSession()` to load the received access and refresh tokens into the Supabase client's state.
        - The `AuthContext` listener (`onAuthStateChange`) detects the `SIGNED_IN` event and fetches the user's profile based on the user ID from the session. The context determines the `currentUserRole` and `currentViewingStudentId` based on the JWT's `app_metadata`.
    6.  **App Handling (on Failure):** Displays an error message.
- **Session Management (PIN Flow):**
  - The custom JWT access token is short-lived.
  - On app startup or when the access token expires, the `AuthContext` attempts to retrieve the stored **custom refresh token**.
  - If found, it calls the `refreshPinSession` Supabase Edge Function.
  - `refreshPinSession` validates the custom refresh token against the stored hash in `active_refresh_tokens` and issues a _new_ custom JWT access token (but typically reuses the same refresh token).
  * The app updates the Supabase client session using `setSession` with the new access token and the existing refresh token.
  * Logout (`signOut`): Clears the custom refresh token from local storage and calls `supabase.auth.signOut({ scope: 'local' })` to clear the client-side Supabase session state. On web, a page reload is forced as a workaround for a client bug. Authorization and access control rely heavily on server-side **Row Level Security (RLS)** policies and **Edge Function logic**.

## 3. Core Features by Role

_(Roles remain largely the same, but emphasize API calls now trigger Edge Functions)_

### 3.1. Admin

- **User Management:** CRUD operations via invoking Edge Functions (`createUser`, `updateUserWithLinks`, `deleteUser`, `toggleUserStatus`). Manages links via `updateUserWithLinks`. Pagination handled via hooks fetching data protected by RLS.
- **PIN Management:** Generates temporary login PINs for any user/role via UI controls invoking `generate-onetime-pin` Edge Function.
- **Instrument Management:** CRUD via API (`fetchInstruments`, `createInstrument`, `updateInstrument`, `deleteInstrument`) protected by Admin RLS.
- **Task Library Management:** CRUD via API (`fetchTaskLibrary`, `createTaskLibraryItem`, `updateTaskLibraryItem`, `deleteTaskLibraryItem`) protected by Admin RLS.
- **Task Assignment:** Assigns tasks via UI invoking `assignTask` Edge Function. Can use library items or create Ad-Hoc tasks.
- **Task Verification:** Views pending tasks, approves/rejects via UI invoking `verifyTask` Edge Function.
- **Rewards Catalog Management:** CRUD via API (`fetchRewards`, `createReward`, `updateReward`, `deleteReward`) protected by Admin RLS.
- **Ticket Adjustments:** Manually adjusts via UI invoking `adjustTickets` Edge Function.
- **Reward Redemption:** Redeems rewards for students via UI invoking `redeemReward` Edge Function.
- **History Viewing:** Views global history via API (`fetchTicketHistory`) protected by Admin RLS. Pagination handled via hook.
- **Announcements:** CRUD via API (`fetchAnnouncements`, `createAnnouncement`, `updateAnnouncement`, `deleteAnnouncement`) protected by Admin RLS.
- **Challenge Management (TBD):** _If implemented._
- **Manage Avatar (TBD):** _If implemented._

### 3.2. Teacher

- **View Linked Students:** Fetches students via API (`fetchStudents` with `teacherId` filter) protected by RLS. Displays key details.
- **View Student Profile:** Navigates to a view fetching student profile (`fetchUserProfile`), assigned tasks (`fetchAssignedTasks`), and history (`fetchTicketHistory`), protected by RLS checking teacher-student link. Pagination handled by hooks.
- **PIN Management:** Generates temporary login PINs for **linked students** (role 'student' or 'parent') or **themselves** (role 'teacher') via UI controls invoking `generate-onetime-pin` Edge Function.
- **Task Assignment:** Assigns tasks via UI invoking `assignTask` Edge Function (authorization checked server-side).
- **Task Verification:** Views pending tasks for linked students, verifies via UI invoking `verifyTask` Edge Function (authorization checked server-side).
- **Challenge Creation/Management (TBD):** _If implemented._
- **Manage Own Avatar (TBD):** _If implemented._
- **Manage Own Credentials:** Can update own Email/Password (if applicable) via UI invoking `updateAuthCredentials` Edge Function.

### 3.3. Student

- **Dashboard:** Fetches own profile data (`fetchUserProfile`), balance (`fetchStudentBalance`), goal info, recent history/tasks via API protected by RLS.
- **Task List:** Fetches own assigned tasks (`fetchAssignedTasks`), displays status. Marks complete via API (`updateAssignedTask` RLS allows this specific update). Pagination handled by hook.
- **View Task Links (TBD):** _If implemented._
- **Rewards Catalog:** Fetches via API (`fetchRewards`). Views progress, sets goal (local state). Redemption (TBD - likely requires Admin action currently).
- **Ticket History:** Fetches personal history (`fetchTicketHistory`), protected by RLS. Pagination handled by hook.
- **Announcements:** Fetches via API (`fetchAnnouncements`).
- **View Available Challenges (TBD):** _If implemented._
- **Accept Challenge (TBD):** _If implemented._
- **Manage Own Avatar (TBD):** _If implemented._
- **Manage Own Credentials:** Can update own Email/Password (if applicable) via UI invoking `updateAuthCredentials` Edge Function.

### 3.4. Parent

- **Student Selection:** If linked to multiple students (fetched via `fetchUserProfile` for parent), selects which child's profile to view.
- **View Student Dashboard:** Renders `StudentView` component for the selected child. Data fetched using child's ID, protected by RLS checking parent-child link.
- **Mark Tasks Complete:** Can mark selected child's tasks complete via API (`updateAssignedTask` RLS allows this specific update).
- **Link Additional Students:** Mechanism TBD (likely Admin action via `updateUserWithLinks` or similar).
- **Send Reminders (TBD):** _Functionality subject to decision._
- **Manage Own Avatar (TBD):** _If implemented._
- **Manage Child's Avatar (TBD):** _If implemented._
- **Manage Own Credentials:** Can update own Email/Password (if applicable) via UI invoking `updateAuthCredentials` Edge Function.

## 4. Task & Challenge Workflow

_(Challenge Sub-Workflow remains TBD)_

- **Standard Task Workflow:**
  1.  **Creation/Assignment:** Admin/Teacher UI calls `assignTask` Edge Function.
  2.  **Completion:** Student/Parent UI calls `updateAssignedTask` API (direct DB update allowed by RLS). Sets `is_complete=true`, `verification_status='pending'`.
  3.  **Verification Queue:** Task appears in Teacher/Admin queues (fetched via `fetchAssignedTasks` with status filters).
  4.  **Verification:** Teacher/Admin UI calls `verifyTask` Edge Function. Sets final `verificationStatus`, `verifiedById`, `verifiedDate`, `actualPointsAwarded`. Function inserts `ticket_transactions` if points > 0.
  5.  **Re-assign (Optional):** Could be triggered by calling `assignTask` again.
  6.  **History:** `ticket_transactions` table logged by `verifyTask`, `adjustTickets`, `redeemReward` Edge Functions.

## 5. Ticket Economy

- **Earning:** Task verification (via `verifyTask` Edge Function), Manual adjustment (via `adjustTickets` Edge Function).
- **Spending (Redemption):** Admin redemption via UI calling `redeemReward` Edge Function. Student redemption flow TBD. `redeemReward` logs transaction. Automatic redemption announcements TBD.
- **Balance:** Fetched via API (`fetchStudentBalance`) which calls database RPC function `get_student_balance` (summing `ticket_transactions`). Balance implicitly updated by Edge Functions logging transactions.
- **History:** Logged by Edge Functions into `ticket_transactions`. Fetched via API (`fetchTicketHistory`), protected by RLS.

## 6. Data Entities & Concepts

The application manages several core data entities detailed in **[MODEL.md](./MODEL.md)**. Key entities include User Profiles, User Credentials (legacy), Instruments, Task Library, Rewards, Assigned Tasks, Ticket Transactions, Announcements, and various Link Tables. Access and modification are controlled by **Row Level Security** and **Supabase Edge Functions**.

## 7. Non-Functional Requirements

_(Largely unchanged, but reinforce RLS/Edge Functions)_

- **Platform:** Mobile App (iOS & Android via React Native/Expo).
- **Security:** Secure storage of credentials/JWTs (standard Supabase client for email/pass, `storageHelper` for custom PIN refresh tokens). Secure PIN generation/claim/refresh flow via Edge Functions. Input validation (client & server). Role-based access control enforced primarily by **server-side RLS policies** and **Edge Function authorization logic**.
- **Usability:** Intuitive navigation, clear feedback. Offline NOT required for V1.
- **Performance:** Responsive app, lists handle moderate data (pagination). Database queries/functions optimized (RPC for balance, potentially needed for task/ticket atomicity).

## 8. Cascading Logic for Deactivation/Deletion (Server-Side Implementation)

- **Deactivating a User:** Handled by `toggleUserStatus` Edge Function updating `profiles.status`. Does _not_ cascade delete links. Other functions/RLS should check `status`.
- **Permanently Deleting a User:** Handled by `deleteUser` Edge Function calling `auth.admin.deleteUser`. Relies on **database `ON DELETE CASCADE` / `ON DELETE SET NULL`** foreign key constraints defined in migrations to manage associated data removal/cleanup across tables (`profiles`, `user_credentials`, `onetime_pins`, `active_refresh_tokens`, link tables, potentially `assigned_tasks`, `ticket_transactions`). _Ensure FK constraints are correctly defined in migrations._

## 9. Asset Requirements & Handover (Action: Dan)

- Storefront Photos
- Interior Photos
- Lesson Room Photos
- Handover: Dan Lefler to provide.
- Usage: `PublicView` design, potentially themed backgrounds.

## 10. Pending Decisions (Input Required: Dan)

_(Largely unchanged, but added clarity on PIN identifier)_

1.  **Task Link URL:** Implement `link_url` field?
2.  **Image Requirements & Avatars:** Require stored images for Instruments? Avatars (which roles)? Mandatory Reward images?
3.  **Automated Redemption Announcements:** Auto-generate on significant reward redemption? Definition of "significant"? Message format?
4.  **Challenge Feature (Go/No-Go):** Implement distinct "Challenge" system in V1? (If yes, requires detailed specs on targeting, expiry, acceptance flow).
5.  **Task/Reward/Announcement Fields:** Confirm necessity of `description` fields? Finalize Announcement fields/types? (`relatedStudentId` usage confirmed for redemptions, others needed?).
6.  **PIN Login Details:**
    - _What identifier is used WITH the PIN?_ Currently, the PIN itself identifies the user via the `onetime_pins` table lookup. Is an additional identifier (Name, Username?) needed on the login screen, or just the PIN field?
    - _Parent Session Differentiation:_ Confirmed: Handled by `generate-onetime-pin` setting `targetRole='parent'` and `claim-onetime-pin` setting appropriate `app_metadata` in the JWT. `AuthContext` reads this metadata.
7.  **Additional Login Methods:** Offer Email/Password for Students/Parents as alternative/replacement to PIN flow? (Requires `updateAuthCredentials` usage by them).
8.  **Parent Reminders Feature (Go/No-Go):** Implement in V1?
9.  **Data Deletion Policy:** Confirm `ON DELETE` actions for `assigned_tasks` and `ticket_transactions` foreign keys referencing `profiles.id` (CASCADE or SET NULL?).

## 11. Potential Future Enhancements (Beyond V1 Scope / Pending Interest)

The following are ideas for potential future enhancements, not included in the current core scope but documented for consideration:

- **Gamification:**
  - Practice Streaks (Daily/Weekly) with bonuses/badges.
  - Leaderboards (Weekly/Monthly ticket earners, challenge completers - anonymized/opt-in).
  - Badges/Achievements for milestones.
  - XP/Leveling System alongside tickets.
  - Limited-Time "Ticket Multiplier" Events.
  - Teacher/Admin "Shout-Outs" for notable student effort.
- **Communication & Community:**
  - Teacher comments on verified tasks.
  - Simple, targeted Teacher announcements to their students.
  - (Carefully Scoped) Simple Student-to-Teacher question mechanism about tasks.
- **Utility & Learning Aids:**
  - In-app Practice Timer.
  - In-app Metronome.
  - (Complex) In-app Instrument Tuner.
  - Curated Resource Library linked from tasks or a dedicated section.
- **Parent-Specific:**
  - Weekly Progress Summary screen/notification.
  - Goal Contribution/Boost mechanism (requires careful design).
- **Admin/Teacher Workflow:**
  - Bulk Task Assignment.
  - Teacher-specific Task Templates/Presets.
  - Admin Reporting/Analytics Dashboard.
