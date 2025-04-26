# Danmans Virtual Ticket App - Functional Specification

## 1. Overview

This document outlines the functional requirements for the Danmans Virtual Ticket App, a mobile application designed to manage student rewards using a virtual ticket system within a music school or similar educational setting. The app caters to different user roles: **Admin**, **Teacher**, **Student**, and **Parent**. Data fetching and state management are primarily handled using TanStack Query, interacting with defined API endpoints (initially mocked via MSW, target backend: Supabase).

The primary goal is to provide an engaging system for students to track progress and earn virtual tickets redeemable for rewards, complementing the physical ticket system. Key features include virtual ticket tracking, task assignment/completion/verification, a rewards catalog, transaction history, and announcements.

Future considerations, pending discussion and decisions, include features like parent-initiated reminders, enhanced task linking, user avatars, and the implementation of distinct "Challenges" alongside assigned tasks (See Section 10: Pending Decisions & Section 11: Potential Future Enhancements).

## 2. User Creation, Linking, and Authentication

*   **Account Creation:** Exclusively performed by the **Admin** role via a secure Admin interface. Admin creates accounts for **Admin**, **Teacher**, and **Student** users (likely creating entries in both `auth.users` and `profiles`). (Parents are not explicitly created via this interface). Requires first name, last name, role selection. Nickname is optional. For Students, Admin can link initial Teacher(s) and Instrument(s) via link tables, and sets an initial numerical login PIN. Uses backend API (e.g., Supabase functions/direct inserts).
*   **User Linking:** Relationships (Student<->Teacher, Student<->Instrument, Parent<->Student) are managed via **link tables** in the database (e.g., `student_teachers`, `student_instruments`, `parent_students`). Admin manages Teacher/Instrument links via the Admin UI (likely through update operations modifying link tables). Parent linking mechanism relies on backend logic associating parent profiles with student profiles (details TBD, potentially via Admin action or a separate Parent registration flow linked to student).
*   **User Deactivation/Deletion (Admin Action):**
    *   Admins can manage user accounts via their interface.
    *   **Deactivation/Reactivation (Primary):** Uses backend API (e.g., `PATCH` to update `profiles.status` or Supabase equivalent). A confirmation modal should appear. Deactivation sets `status` to `'inactive'`, prevents login, removes from active lists. Data is retained. Reactivation sets status to `'active'`. Cascading logic (Sec 8) is a backend concern.
    *   **Permanent Deletion (Secondary):** Uses backend API (e.g., `DELETE` targeting `auth.users` and `profiles` or Supabase equivalent). Requires explicit confirmation via dedicated modal. Removes user record and associated data (backend policy). Cascading logic (Sec 8) is a backend concern.
*   **Authentication (Admin/Teacher):**
    *   Login via a dedicated secure mechanism (e.g., email/password) managed by the backend authentication system (e.g., Supabase Auth). Requires a distinct login interface. Backend returns a JWT session token upon successful login.
*   **Authentication (Student/Parent - PIN-Based):**
    *   **PIN Setting & Management:** A unique numerical PIN (e.g., 4-6 digits) is initially set by the **Admin** upon Student account creation. The PIN can subsequently be viewed or reset by the **Admin** or by any **Teacher** linked to that student, via their respective UI interfaces. PINs must be stored securely (e.g., hashed) on the backend (likely in the `user_credentials` table).
    *   **Login Flow:**
        1.  The mobile app presents a login screen requesting a student identifier (**Decision Pending:** e.g., First Name + Last Name, generated username, email?) and the numerical PIN.
        2.  The user (Student or Parent) enters the identifier and PIN.
        3.  The app sends these credentials to a dedicated backend login endpoint (e.g., a Supabase Edge Function).
        4.  The backend endpoint:
            *   Finds the student based on the identifier.
            *   Validates the provided PIN against the stored (hashed) PIN for that student (from `user_credentials`).
            *   **If validation succeeds:**
                *   Determines the context: If the login is for the student directly, or if it's a parent accessing the student profile (**Decision Pending:** How is parent context identified if using child credentials?).
                *   Generates a standard JWT (JSON Web Token) session token containing relevant claims (e.g., `user_id` from `auth.users`, `role` ('student' or 'parent'), potentially `viewing_student_id` if parent). This token is signed by the backend (Supabase handles signing via Admin SDK).
                *   Returns the generated JWT session token and necessary context (role, user ID, viewing student ID) to the app.
            *   **If validation fails:** Returns an authentication error.
        5.  **App Handling (on Success):**
            *   The app securely stores the received JWT session token (e.g., using `expo-secure-store`).
            *   The app updates the `AuthContext` state with the user's role, user ID, viewing student ID (if applicable), and marks the user as authenticated.
            *   Subsequent API calls (to Supabase or Edge Functions) will include this JWT in the `Authorization: Bearer <token>` header. Supabase automatically verifies this token for database access based on RLS policies and function security settings.
        6.  **App Handling (on Failure):** The app displays an error message.
*   **Session Management:**
    *   The JWT token stored on the device represents the user's session.
    *   The app should attempt to load the session token on startup. If a valid token exists, the user is considered logged in.
    *   Tokens have an expiration time set by the backend (Supabase defaults). The app might need to handle token refresh logic (Supabase client library often assists) or prompt for re-login upon expiration.
    *   `AuthContext` manages the application's auth state based on the presence and validity of the session token.
    *   Logout involves clearing the stored token and resetting the `AuthContext` state.

## 3. Core Features by Role

### 3.1. Admin
*   **User Management:** CRUD operations on user profiles (`profiles` table) and links (link tables) via API/backend functions. Manages user status (active/inactive) and permanent deletion. Pagination handled via hooks.
*   **PIN Management:** Set/Reset Student PINs via Admin UI controls (primary responsibility).
*   **Instrument Management:** CRUD via API (`/api/instruments` or Supabase equivalent).
*   **Task Library Management:** CRUD via API (`/api/task-library` or Supabase equivalent).
*   **Task Assignment:** Assigns tasks via API (`POST /api/assigned-tasks`). Can use library items or create Ad-Hoc tasks.
*   **Task Verification:** Views pending tasks, approves/rejects via API (`PATCH /api/assigned-tasks/:id`).
*   **Rewards Catalog Management:** CRUD via API (`/api/rewards`).
*   **Ticket Adjustments:** Manually adjusts via API (`POST /api/ticket-adjustments`).
*   **History Viewing:** Views global history via API (`GET /api/ticket-history`). Pagination handled via hook.
*   **Announcements:** CRUD via API (`/api/announcements`).
*   **Challenge Management (TBD):** *If the Challenge feature is approved,* Admins would gain capabilities to create, manage, and target challenges.
*   **Manage Avatar (TBD):** *If Avatars are approved for roles,* Admin might manage avatars for users.

### 3.2. Teacher
*   **View Linked Students:** Fetches students linked via `student_teachers` table. Displays key details (name, instruments, balance).
*   **View Student Profile:** Navigates to a view fetching student profile, assigned tasks, and history. Pagination handled by hooks.
*   **PIN Management:** Can view and reset the PIN for their **linked students** via Teacher UI controls.
*   **Task Assignment:** Assigns via API (`POST /api/assigned-tasks`).
*   **Task Verification:** Views pending tasks for linked students, verifies via API (`PATCH /api/assigned-tasks/:id`).
*   **Challenge Creation/Management (TBD):** *If the Challenge feature is approved,* Teachers might create/manage challenges, potentially targeted. (Specific permissions TBD).
*   **Manage Own Avatar (TBD):** *If Teacher Avatars are approved.*

### 3.3. Student
*   **Dashboard:** Fetches own profile data, balance, goal info, recent history/tasks.
*   **Task List:** Fetches assigned tasks, displays status. Marks complete via API (`PATCH /api/assigned-tasks/:id`). Pagination handled by hook. Accepted challenges (if implemented) appear here.
*   **View Task Links (TBD):** *If Task URLs are approved,* Students would see/click links in tasks.
*   **Rewards Catalog:** Fetches via API (`GET /api/rewards`). Views progress, sets goal (local state or TBD). Redemption (TBD - requires flow/button).
*   **Ticket History:** Fetches personal history via API (`GET /api/ticket-history?studentId=...`). Pagination handled by hook.
*   **Announcements:** Fetches via API (`GET /api/announcements`).
*   **View Available Challenges (TBD):** *If the Challenge feature is approved,* fetches relevant challenges.
*   **Accept Challenge (TBD):** *If the Challenge feature is approved,* action via API (`POST /api/challenges/:id/accept`) adds the challenge to their task list.
*   **Manage Own Avatar (TBD):** *If Student Avatars are approved.*

### 3.4. Parent
*   **Student Selection:** If linked to multiple students, selects which child's profile to view.
*   **View Student Dashboard:** Renders `StudentView` component for the selected child. Fetches parent profile to get linked student IDs.
*   **Mark Tasks Complete:** Can mark selected child's tasks complete via API (`PATCH /api/assigned-tasks/:id`).
*   **Link Additional Students:** Mechanism TBD (likely Admin action).
*   **Send Reminders (TBD):** *Functionality subject to decision.*
*   **Manage Own Avatar (TBD):** *If Parent Avatars are approved.*
*   **Manage Child's Avatar (TBD):** *If Student Avatars are approved and Parent permission decided.*

## 4. Task & Challenge Workflow

*   **Challenge Sub-Workflow (TBD):** *If the Challenge feature is approved:*
    1.  **Challenge Creation:** Admin/Teacher creates a `Challenge` record.
    2.  **Challenge Discovery:** Student views available challenges.
    3.  **Challenge Acceptance:** Student accepts. Backend creates a new `AssignedTask` record linked to the challenge.
    4.  The generated `AssignedTask` follows the standard task workflow below.
*   **Standard Task Workflow:**
    1.  **Creation/Assignment:** `POST /api/assigned-tasks`. (Can be manual or from challenge acceptance).
    2.  **Completion:** Student/Parent marks complete (`PATCH /api/assigned-tasks/:id` sets `isComplete: true`).
    3.  **Verification Queue:** Task appears in Teacher/Admin queues (`GET /api/assigned-tasks?assignmentStatus=pending`).
    4.  **Verification:** Teacher/Admin verifies (`PATCH /api/assigned-tasks/:id` sets `verificationStatus`, `verifiedById`, `verifiedDate`, `actualPointsAwarded`). Ticket balance updated on backend.
    5.  **Re-assign (Optional):** Can be triggered post-verification.
    6.  **History:** Backend logs `TicketTransaction` on successful verification/adjustment/redemption.

## 5. Ticket Economy

*   **Earning:** Task completion (via Verification step), Manual adjustment (`POST /api/ticket-adjustments`).
*   **Spending (Redemption):** `POST /api/reward-redemptions`. Redemption flow for students TBD. Upon successful redemption, an `Announcement` *might* be automatically generated for significant rewards (*Decision Pending*).
*   **Balance:** Fetched via API (`GET /api/students/:id/balance`). Updated implicitly by backend logic/functions during task verification, adjustments, redemptions.
*   **History:** Logged by backend. Fetched via API (`GET /api/ticket-history`).

## 6. Data Entities & Concepts

The application manages several core data entities. The specific database table structure, columns, types, and relationships are detailed in the separate **[MODEL.md](./MODEL.md)** file. Conceptually, the main entities are:

*   **User Profiles:** Represents all individuals using the app (Admins, Teachers, Students, Parents). Linked to the core authentication identity and stores common information like name, role, and status. May potentially include user avatars (*Decision Pending*).
*   **User Credentials:** Stores specific login information not suitable for the main profile, currently planned for securely storing hashed Student PINs.
*   **Instruments:** A list of musical instruments taught or played. May potentially include icons/images (*Decision Pending*).
*   **Task Library:** A predefined list of reusable tasks with titles, descriptions (*Decision Pending*), base ticket values, and potentially external links (*Decision Pending*).
*   **Rewards:** The catalog of items redeemable with tickets, including name, cost, potentially mandatory images (*Decision Pending*), and descriptions (*Decision Pending*).
*   **Assigned Tasks:** Represents a specific task instance assigned to a particular student by a teacher or admin, or accepted from a challenge (*Challenge Feature TBD*). Tracks completion and verification status, points awarded, and potentially links (*Decision Pending*).
*   **Ticket Transactions:** A historical log of all events that change a student's ticket balance (task awards, manual adjustments, redemptions).
*   **Announcements:** Store-wide or targeted messages (e.g., challenges, redemption celebrations (*Auto-generation TBD*)). Field requirements and types need final confirmation (*Decision Pending*).
*   **Challenges (TBD):** A potential feature for opt-in tasks targeted at specific student groups (*Decision Pending*).
*   **Relationships:** Connections between entities (like Students-Teachers, Students-Instruments, Parents-Students) are managed using standard relational database link tables (see `MODEL.md`).

## 7. Non-Functional Requirements

*   **Platform:** Mobile App (iOS & Android via React Native/Expo). Potential for Admin web interface later.
*   **Security:** Secure storage of credentials/JWTs. Secure PIN hashing (backend). Input validation. Role-based access control enforced by backend RLS policies. Supabase security best practices.
*   **Usability:** Intuitive navigation, clear feedback to users. Offline capability is NOT a requirement for V1.
*   **Performance:** App should be responsive. Lists should handle moderate amounts of data smoothly (pagination/virtualization for large lists). Database queries optimized.

## 8. Cascading Logic for Deactivation/Deletion (Backend Implementation)

*   **Deactivating a User (Student/Teacher/Parent/Admin):** Backend sets `status` on `profiles` to 'inactive'. User cannot log in. RLS policies might restrict access further. Associated data (tasks, history, links) generally remain but might be filtered in UI displays. Reactivation sets status to 'active'. Link table entries are NOT automatically removed/restored upon status change.
*   **Permanently Deleting a User:** Backend removes the `auth.users` record and the corresponding `profiles` record (ideally using `ON DELETE CASCADE` on the `profiles.id` FK). Associated entries in *link tables* (`student_teachers`, `parent_students`, `student_instruments`) should also be removed via `ON DELETE CASCADE`. **Decision Pending:** Should related `assigned_tasks` and `ticket_transactions` be cascade deleted or anonymized (e.g., `student_id` set to NULL if allowed)? `created_by_id`, `assigned_by_id` etc. fields referencing the deleted user might need handling (e.g., set NULL or keep reference).

## 9. Asset Requirements & Handover (Action: Dan)

To create a visually engaging public-facing view and potentially themed backgrounds within the app, the following assets are required:

*   **Storefront Photos:** High-quality images of the Danmans Music Store exterior.
*   **Interior Photos:** High-quality images showcasing the general interior, retail areas, etc.
*   **Lesson Room Photos:** High-quality images of the various soundproofed lesson rooms.

**Handover:** Dan Lefler to provide these image assets to the development team.

**Usage:** These assets will be used primarily for:
*   Creating a compelling visual design for the `PublicView` welcome/landing page.
*   Potentially being used as subtle, opaque background elements in various app views to enhance branding and feel (implementation TBD).

## 10. Pending Decisions (Input Required: Dan)

The following features and details require discussion and **explicit decisions from Dan Lefler** before final specification and implementation:

1.  **Task Link URL:**
    *   Should an optional `link_url` field be added to tasks (library and assigned) for external resources?
    *   _(Example: Should teachers be able to add a link like `https://www.ultimateguitar.com/tabs/1234` to a "Learn Song X" task?)._
2.  **Image Requirements & Avatars:**
    *   **Instruments:** Require stored images (`image_path`), or is the current hardcoded icon approach sufficient?
    *   _(Example: Show actual pictures of instruments available as rewards, or just generic icons like now?)._
    *   **Avatars:** Implement user avatars? For which roles (Teacher? Student? Parent? Admin?)?
    *   _(Example: Allow students and/or teachers to upload profile pictures?)._
    *   **Rewards:** Is an image (`image_path`) mandatory for *all* rewards?
    *   _(Example: Is it okay if some rewards, like a 'Snickers Bar', don't have a specific image uploaded?)._
3.  **Automated Redemption Announcements:**
    *   Should the system *automatically* generate a public announcement when a "significant" reward is redeemed?
    *   _(Example: When a student redeems the 'Fender Stratocaster' (cost 10000), should an announcement automatically appear saying "🎉 Alice redeemed a Fender Stratocaster! 🎉"? Or only if Admin manually creates it?)._
    *   If yes, how is "significant" defined (cost threshold, specific items)?
    *   If yes, what should the message format be?
4.  **Challenge Feature (Go/No-Go):**
    *   Should the distinct "Challenge" system (opt-in tasks, potentially targeted) be implemented in V1?
    *   _(Example: Should teachers be able to post 'challenges' like "Learn 3 new scales this month for 50 bonus tickets" that *any* relevant student can choose to accept and attempt?)._
    *   *If Yes to Challenges:*
        *   Can Teachers target challenges only to their own students, or more broadly?
        *   Is an `expiry_date` needed for challenges?
        *   Should accepted challenges look different in the student's task list?
        *   Who is the `assigned_by_id` for tasks generated from accepted challenges?
5.  **Task/Reward/Announcement Fields:**
    *   Confirm necessity/optionality of `description` fields for Task Library items and Rewards.
    *   _(Example: Is just 'Practice 15 mins' enough, or do we need the extra description text field? Same for rewards?)._
    *   Finalize Announcement fields (`message` requirement?), types (sufficient?), and `relatedStudentId` usage (only redemptions?).
    *   _(Example: Is the 'message' field always needed? Are 'announcement', 'challenge', 'redemption' types enough?)._
6.  **PIN Login Details:**
    *   What identifier (Name, Username, Email?) is used with the PIN for Student/Parent login?
    *   _(Example: How does a student identify themselves with their PIN? By typing `Alice Wonder` + PIN, or `alice.w` + PIN, or `alice.wonder@email.com` + PIN?)._
    *   How is a Parent session differentiated from a Student session when using the child's credentials?
    *   _(Example: If Mom Wonder logs in using `Alice Wonder` + Alice's PIN, how does the app confirm she's a Parent to show the Parent view? Does the backend check linked parents during login?)._
7.  **Additional Login Methods:** Offer Email/Password for Students/Parents too?
    *   _(Example: Should students *also* be able to set an email/password to log in, as an alternative to their Identifier+PIN? What about Parents having their own separate email/password login instead of using child credentials?)._
8.  **Parent Reminders Feature (Go/No-Go):**
    *   Should the "Parent Reminders" feature be implemented in V1? (If yes, requires detailed specs).
    *   _(Example: Should parents have a button like "Nudge Alice about 'Practice Scales'" that shows a reminder in Alice's app?)._
9.  **Data Deletion Policy:**
    *   When an Admin permanently deletes a student, should their associated `assigned_tasks` and `ticket_transactions` be cascade deleted or anonymized (e.g., `student_id` set to NULL)?
    *   _(Example: If Admin deletes student 'Bob', should all records of tasks Bob completed and tickets he earned disappear forever, or should they remain but just say 'Deleted Student' instead of 'Bob'?)._

## 11. Potential Future Enhancements (Beyond V1 Scope / Pending Interest)

The following are ideas for potential future enhancements, not included in the current core scope but documented for consideration:

*   **Gamification:**
    *   Practice Streaks (Daily/Weekly) with bonuses/badges.
    *   Leaderboards (Weekly/Monthly ticket earners, challenge completers - anonymized/opt-in).
    *   Badges/Achievements for milestones.
    *   XP/Leveling System alongside tickets.
    *   Limited-Time "Ticket Multiplier" Events.
    *   Teacher/Admin "Shout-Outs" for notable student effort.
*   **Communication & Community:**
    *   Teacher comments on verified tasks.
    *   Simple, targeted Teacher announcements to their students.
    *   (Carefully Scoped) Simple Student-to-Teacher question mechanism about tasks.
*   **Utility & Learning Aids:**
    *   In-app Practice Timer.
    *   In-app Metronome.
    *   (Complex) In-app Instrument Tuner.
    *   Curated Resource Library linked from tasks or a dedicated section.
*   **Parent-Specific:**
    *   Weekly Progress Summary screen/notification.
    *   Goal Contribution/Boost mechanism (requires careful design).
*   **Admin/Teacher Workflow:**
    *   Bulk Task Assignment.
    *   Teacher-specific Task Templates/Presets.
    *   Admin Reporting/Analytics Dashboard.