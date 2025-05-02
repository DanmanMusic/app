# TODO: Project Development & Release

## Gemini Rules/Notes

- When requested to print out file content, provide the full content of the file while be mindful to inflate sections of code commented out during iterations.
- Absolute hard rule of no comments in any code. If code has comments please remove!
- Assume developers are experts but are open to suggestions for better libraries, approaches, or solutions to technical challenges.
- This project is in an early development phase. Backward compatibility is not a requirement (e.g., database schema changes are acceptable).

Remember to replace placeholders like `[ ]` with `[x]` as tasks are completed.

## Development Phase 1: Frontend Prototyping & TQ/MSW Migration

- [x] Refine User Data Model (firstName, lastName, links, status, etc.)
- [x] Set up Mock Data (`src/mocks/`)
- [x] Implement Development View Selector
- [x] Build Core Views (Public, Student, Teacher, Parent, Admin shells)
- [x] Refine UI/UX (Modals, Images, Styles, Components)
- [x] Implement `AuthContext`
- [x] Implement `DataContext` (Initial version, now minimal)
- [x] Refactor Task Assignment (Ad-Hoc vs Library)
- [x] Implement User Deactivate/Delete Flow Modals
- [x] Implement Pagination Architecture (Hooks, Controls)
- [x] Install & Configure TanStack Query and MSW
- [x] Create API Client Layer (`src/api/`)
- [x] Create MSW Handlers (`src/mocks/handlers.ts`)
- [x] Implement TQ/MSW User List Queries (`usePaginated*`, `AdminUsersSection`)
- [x] Implement TQ/MSW User Mutations (CRUD, Status Toggle in Modals)
- [x] Implement Search Features (Student Select, Admin Student List)
- [x] Refactor Other List Queries w/ TQ/MSW (Task Lib, Rewards, Anncs, Instruments, Assigned Tasks, History)
- [x] Implement Other CRUD Mutations w/ TQ/MSW (Task Lib, Rewards, Anncs, Instruments)
- [x] Implement Assigned Task Mutations (Mark Complete, Delete)
- [x] Refactor Views (`PublicView`, `StudentView`, `ParentView`, `TeacherView`, `AdminView`) to use TQ Hooks/Mutations instead of `DataContext` (excluding DevSelector)
- [x] Refactor Modals (`TaskVerificationModal`, `AssignTaskModal`, `CreateUserModal`, `EditUserModal`, `SetGoalModal`, etc.) to fetch own data/use internal mutations.
- [x] Remove `DataContext` provider and most of its state/logic (Kept minimal `currentMockUsers` for Dev Selector).
- [x] Implement Assigned Task: Task Verification (`PATCH /api/assigned-tasks/:id` via `TaskVerificationModal`).
- [x] Implement Assigned Task: Re-assign (`POST /api/assigned-tasks` via `TaskVerificationModal`).
- [x] Implement Assigned Task: Assign Task (`POST /api/assigned-tasks` via `AssignTaskModal`).
- [x] Implement Tickets: Manual Adjustment (`POST /api/ticket-adjustments` via `ManualTicketAdjustmentModal`).
- [x] Implement Rewards: Redeem Reward (`POST /api/reward-redemptions` via `RedeemRewardModal`).
- [x] Role-Based Action Control (Teacher vs. Admin): Partially implemented via optional props in detail views.
- [x] UI Feedback: Replaced `Alert.alert` with `react-native-toast-message`.
- [x] Add basic scroll functionality to main views (`AdminView`, `TeacherView`, `StudentView`).

## Development Phase 2: "Big Bang" Supabase Schema & Read/Basic-Write API Migration

- [x] **Storage Buckets:** Create required public buckets (`instrument-icons`, `reward-icons`). Apply temporary permissive Storage RLS policies.
- [x] **Remove MSW:** Delete `src/mocks/`, `handlers.ts`, update `App.tsx`, `metro.config.js`, `package.json`.
- [x] **Refactor API Layer (`src/api/`)**:
  - [x] `instruments.ts` (CRUD + Storage)
  - [x] `rewards.ts` (CRUD + Storage)
  - [x] `taskLibrary.ts` (CRUD)
  - [x] `announcements.ts` (CRUD)
  - [x] `users.ts` (Reads for all roles, basic profile `updateUser`, `toggleUserStatus`. Deferred `createUser`, `deleteUser`, link table updates).
  - [x] `stats.ts` (Read counts from DB).
  - [x] `tickets.ts` (Read history/balance. Deferred `adjustTickets`, `redeemReward`).
  - [x] `assignedTasks.ts` (Read tasks. Basic `createAssignedTask`. Deferred `updateAssignedTask` verification/points logic. Basic `deleteAssignedTask`).
- [x] **Refactor Hook Layer (`src/hooks/`)**:
  - [x] `usePaginatedStudents.ts`
  - [x] `usePaginatedTeachers.ts`
  - [x] `usePaginatedParents.ts`
  - [x] `usePaginatedAssignedTasks.ts`
  - [x] `usePaginatedStudentHistory.ts`
  - [x] `usePaginatedStudentTasks.ts`
  - [x] `usePaginatedTicketHistory.ts`
- [x] **Refactor Component Layer (`src/views/`, `src/components/`)**:
  - [x] `AdminUsersSection.tsx` (Consume user hooks).
  - [x] `AdminStudentDetailView.tsx` (Fetch profile, use task/history hooks, adjust handlers).
  - [x] `AdminTeacherDetailView.tsx` (Fetch profile, use student hook).
  - [x] `AdminParentDetailView.tsx` (Fetch profile, use useQueries for students).
  - [x] `AdminView.tsx` (Simplify state, use section components, adjust handlers).
  - [x] `TeacherView.tsx` (Fetch profile, use section components).
  - [x] `ParentView.tsx` (Fetch profiles, use StudentView).
  - [x] `StudentView.tsx` (Verify data flow).
  - [x] `PublicView.tsx` (Verify data flow).
  - [x] `Create*/Edit*` Modals for Instruments, Rewards, Task Library, Announcements (Verify API usage).
  - [x] `EditUserModal.tsx` (Use updateUser API, acknowledge deferred links).
  - [x] `DeactivateOrDeleteUserModal.tsx` (Use toggleUserStatus, disable delete).
  - [x] `ManualTicketAdjustmentModal.tsx` (Fetch balance, disable action).
  - [x] `RedeemRewardModal.tsx` (Fetch balance, disable action).
  - [x] `AssignTaskModal.tsx` (Fetch reads, disable action).
  - [x] `TaskVerificationModal.tsx` (Fetch profile, disable actions).

## Development Phase 3: Authentication & Server-Side Logic

- [x] **Implement Authentication:**
  - [x] Backend: Define schema/logic for PIN storage/validation (`onetime_pins`, `active_refresh_tokens`).
  - [x] Backend: Create Supabase Edge Function (`claim-onetime-pin`).
  - [x] Backend: Create Supabase Edge Function (`generate-onetime-pin`).
  - [x] Frontend: Build PIN Login UI (`LoginModal.tsx`).
  - [x] Frontend: Implement Email/Password login UI (`LoginModal.tsx`).
  - [x] Frontend: Refactor `AuthContext` for real Supabase sessions.
  - [x] Frontend: Implement Client-Side Custom PIN Refresh Logic (`AuthContext`).
  - [x] Frontend: Integrate `LoginModal` into `App.tsx`.
  - [x] Frontend: Fixed PIN session refresh conflict by disabling Supabase client auto-refresh.

* [x] **Implement Secure RLS:**
  - [x] Apply secure RLS policies for Storage buckets (`instrument-icons`, `reward-icons`).
  - [x] Define `is_admin()` helper function.
  - [x] Apply secure RLS policies for DB tables (`rewards`, `announcements`, `profiles`, `instruments`, `task_library`, `assigned_tasks`, `student_instruments`, `student_teachers`, `parent_students`, `ticket_transactions`).
  - [x] Restrict sensitive auth tables (`onetime_pins`, `active_refresh_tokens`, `user_credentials`) to service_role access only (no client policies).
  - [x] Created `can_student_or_parent_mark_task_complete()` helper function for RLS.
  - [x] Created `can_student_or_parent_update_profile_limited()` helper function for RLS.
  - [x] Resolved RLS recursion issues on `assigned_tasks` and `profiles` updates using helper functions.
* [x] **Implement Edge Functions for Core Auth/User Management:**
  - [x] `createUser` (handle `auth.admin.createUser`, profile insert, student links).
  - [x] `generate-onetime-pin`.
  - [x] `claim-onetime-pin`.
  - [x] `refresh-pin-session`.
  - [x] `update-auth-credentials`.
  - [x] `get-user-auth-details`.
  - [x] `deleteUser` (incl. protected admin check).
  - [x] `updateUserWithLinks` (handles profile & link tables, respects Teacher permissions).
  - [x] `toggleUserStatus` (moved from client API to EF due to RLS recursion).
* [x] **Implement Edge Functions for Core Workflow Actions:**
  - [x] `assignTask` (Admin/Teacher assign).
  - [x] `verifyTask` (Admin/Teacher verify, includes transaction log insert).
  - [x] `adjustTickets` (Admin manual adjustment, includes transaction log insert).
  - [x] `redeemReward` (Admin redemption, includes transaction log insert, uses RPC).
  - [x] `deleteAssignedTask` (Admin/Teacher delete unverified).
* [x] **Update API Layer (`src/api/`)**:
  - [x] Updated relevant API functions to call respective Edge Functions.
  - [x] Implemented `updateStudentGoal` for direct RLS-based update.
* [x] **Update UI:**
  - [x] Connected Modals to working API/Edge Function flows.
  - [x] Added 'Admins' tab and integration.
  - [x] Created and integrated `AdminAdminDetailView`.
  - [x] Enabled delete buttons/logic.
  - [x] Enabled confirm buttons/logic for verification, assign task, adjust tickets, redeem reward.
  - [x] Implemented persistent student goals.
  - [x] Refactored Admin task view: Replaced modal with in-page `PaginatedTasksList`.
  - [x] Consolidated styles into `commonSharedStyles.ts`.
* [ ] **Security Hardening:**
  - [ ] Implement proper salting for `hashToken` function used for refresh tokens (in `claim-onetime-pin` and `refresh-pin-session`).
  - [ ] Consider implementing rolling refresh tokens in `refresh-pin-session`.
  - [ ] Final review and potential tightening of all RLS policies (post-feature completion).
* [ ] **Debugging & Known Issues:**
  - [x] **BUG:** Investigate/Monitor Chrome/Expo Web session refresh/logout behavior. _(Workaround: Disabled client auto-refresh. Monitoring needed.)_
  - [ ] **TODO:** Refactor `verifyTask` and potentially `adjustTickets`/`redeemReward` Edge Functions to use atomic PostgreSQL RPC functions instead of sequential DB calls for maximum data integrity.
  - [ ] **TODO:** Refactor `get_student_balance` RPC to potentially use a dedicated balance column on `profiles` (updated by triggers/functions) instead of summing transactions, for performance if history grows large.
  - [ ] **TODO:** Add more specific RLS `WITH CHECK` clauses to `assigned_tasks` update policy (`Student/Parent Update - Mark Complete Via Function`) to prevent modification of other fields besides `is_complete`, `completed_date`, `verification_status`, once core functionality is stable.
  - [ ] **BUG:** Admin Users Section - Student status filters (`active`/`inactive`/`all`) and search term filter are not working correctly. Data doesn't seem to refilter when buttons are pressed or text is entered. Hook `usePaginatedStudents` needs investigation.
  - [ ] **BUG/Enhancement:** The `AssignTaskModal` layout (Step 2: Select Task) needs improvement, especially the display of the Task Library list and the Ad-Hoc input fields. Consider better spacing, clearer separation, and potentially making the library list searchable/scrollable independently.
  - [ ] **TESTING:** Thoroughly test the custom refresh token flow (`claim-onetime-pin` -> storage -> `refresh-pin-session`) across different scenarios (app close/reopen, token expiry, multiple logins) on both web and native platforms.
  - [ ] **MISSING FEATURE:** Need a way for non-admin users (Student, Parent, Teacher) to update their *own* profile information (First Name, Last Name, Nickname). Create a new modal (`EditMyProfileModal`?) accessible from their respective views, likely calling the `updateUserWithLinks` Edge Function (which needs to allow self-updates for these fields).
  - [ ] **MISSING FEATURE:** Need a way for *any* user who has set up email/password login (not using PIN) to change their email or password. Reuse/adapt the `SetEmailPasswordModal` or create a new `ChangeCredentialsModal` accessible from their views, calling the `update-auth-credentials` Edge Function.

## Development Phase 4: Features, Refinements & Testing

_(Dependent on resolving/stabilizing Phase 3 issues)_

- [ ] **Address Pending Decisions & Implement Chosen Features:** (Based on Dan Lefler's input from `SPECIFICATION.md` Section 10)
  - [ ] Task Link URLs?
  - [ ] Avatars?
  - [ ] Mandatory Reward Images?
  - [ ] Auto-Redemption Announcements?
  - [ ] Challenge Feature?
  - [ ] Finalize field requirements (descriptions, etc.).
  - [ ] Parent Reminders?
  - [ ] Finalize Data Deletion Policy details (Cascade vs Set Null for `assigned_tasks`, `ticket_transactions`). _(Need to add FKs with chosen policy)_.
  - [ ] Finalize PIN Login Identifier (Name? Username?) & Parent differentiation logic.
  - [ ] Offer Email/Password for Students/Parents too? _(Partially addressed by allowing credential setting)_

* [ ] **Refinements & Thorough Testing:**
  - [ ] Test all user role workflows end-to-end.
  - [ ] Refine UI/UX (including button styles).
  - [ ] Add Foreign Key constraints with appropriate ON DELETE actions (CASCADE/SET NULL) for remaining relationships (e.g., `assigned_tasks` FKs, `ticket_transactions` FK). Create new migration(s).
  - [ ] Add database indexes for common query patterns (e.g., filtering tasks by status/teacher/student). _(Some added, review needed)_.
  - [ ] Consider adding database-level checks (e.g., check constraints) to ensure role consistency in link tables if not handled sufficiently by app logic/RLS.
  - [ ] Unit/integration tests (Optional).

## Supporting Features (Post-MVP / Lower Priority)

- [ ] Frontend: Design and implement `PublicView` welcome/landing page using provided store assets.
- [ ] Frontend: Evaluate and potentially implement opaque background images using provided assets.