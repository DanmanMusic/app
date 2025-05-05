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
  - [x] `taskLibrary.ts` (CRUD - _See Phase 3 for EF migration_)
  - [x] `announcements.ts` (CRUD)
  - [x] `users.ts` (Reads for all roles, basic profile `updateUser`, `toggleUserStatus`. Deferred `createUser`, `deleteUser`, link table updates -> _Now handled by EFs_).
  - [x] `stats.ts` (Read counts from DB).
  - [x] `tickets.ts` (Read history/balance. Deferred `adjustTickets`, `redeemReward` -> _Now handled by EFs_).
  - [x] `assignedTasks.ts` (Read tasks. Basic `createAssignedTask`. Deferred `updateAssignedTask` verification/points logic. Basic `deleteAssignedTask` -> _Now handled by EFs_).
- [x] **Refactor Hook Layer (`src/hooks/`)**:
  - [x] `usePaginatedStudents.ts` (_Filter bug needs re-verification_)
  - [x] `usePaginatedTeachers.ts`
  - [x] `usePaginatedParents.ts`
  - [x] `usePaginatedAdmins.ts`
  - [x] `usePaginatedAssignedTasks.ts`
  - [x] `usePaginatedStudentHistory.ts`
  - [x] `usePaginatedStudentTasks.ts`
  - [x] `usePaginatedTicketHistory.ts`
- [x] **Refactor Component Layer (`src/views/`, `src/components/`)**:
  - [x] `AdminUsersSection.tsx` (Consume user hooks).
  - [x] `AdminStudentDetailView.tsx` (Fetch profile, use task/history hooks, adjust handlers, removed delete confirmation).
  - [x] `AdminTeacherDetailView.tsx` (Fetch profile, use student hook).
  - [x] `AdminParentDetailView.tsx` (Fetch profile, use useQueries for students).
  - [x] `AdminView.tsx` (Simplify state, use section components, added task deletion confirmation).
  - [x] `TeacherView.tsx` (Fetch profile, use section components, added task deletion confirmation, added 'tasks-full' section, added create task lib handlers).
  - [x] `ParentView.tsx` (Fetch profiles, use StudentView).
  - [x] `StudentView.tsx` (Verified data flow, added Teacher display, enhanced task view).
  - [x] `PublicView.tsx` (Verify data flow).
  - [x] `Create*/Edit*` Modals for Instruments, Rewards, Announcements (Verified API usage).
  - [x] `Task Library Modals/Items`: Updated for new fields (instruments, files, urls) and teacher creation/edit/delete capabilities.
  - [x] `EditUserModal.tsx` (Uses EF).
  - [x] `DeactivateOrDeleteUserModal.tsx` (Uses EFs).
  - [x] `ManualTicketAdjustmentModal.tsx` (Uses EF).
  - [x] `RedeemRewardModal.tsx` (Uses EF).
  - [x] `AssignTaskModal.tsx` (Uses EF, updated for instrument filtering and copying task lib data).
  - [x] `TaskVerificationModal.tsx` (Uses EF).
  - [x] `PaginatedTasksList.tsx` (Updated for name lookups, handles delete initiation, **Fixed filtering via RPC**).
  - [x] `TicketHistoryItem.tsx` (Updated layout).

## Development Phase 3: Authentication & Server-Side Logic

- [x] **Implement Authentication:**
  - [x] Backend: Define schema/logic (`onetime_pins`, `active_refresh_tokens`).
  - [x] Backend: Create EF (`claim-onetime-pin`).
  - [x] Backend: Create EF (`generate-onetime-pin`).
  - [x] Frontend: Build PIN Login UI (`LoginModal.tsx`).
  - [x] Frontend: Implement Email/Password login UI (`LoginModal.tsx`).
  - [x] Frontend: Refactor `AuthContext` for real Supabase sessions & custom PIN refresh (web workaround implemented, **refactored profile fetch using useQuery**).
  - [x] Frontend: Integrate `LoginModal` into `App.tsx`.
- [x] **Implement Secure RLS:**
  - [x] Apply secure RLS policies for Storage buckets (`instrument-icons`, `reward-icons`).
  - [x] Apply secure RLS policy for `task-library-attachments` (**updated read policy**).
  - [x] Define helper functions (`is_active_admin`, `is_active_admin_or_teacher`).
  - [x] Apply/Update secure RLS policies for DB tables (most reads via RLS, most writes via EFs).
  - [x] Restrict sensitive auth tables to service_role access.
  - [x] Created helper functions for specific RLS checks (`can_...`).
- [x] **Implement Edge Functions for Core Auth/User Management:**
  - [x] `createUser`
  - [x] `generate-onetime-pin`
  - [x] `claim-onetime-pin`
  - [x] `refresh-pin-session` (**corrected JWT payload**)
  - [x] `update-auth-credentials`
  - [x] `get-user-auth-details`
  - [x] `deleteUser`
  - [x] `updateUserWithLinks` (**refined authorization for self-updates**)
  - [x] `toggleUserStatus`
- [x] **Implement Edge Functions for Core Workflow Actions:**
  - [x] `assignTask` (handles task lib data copy)
  - [x] `verifyTask`
  - [x] `adjustTickets`
  - [x] `redeemReward`
  - [x] `deleteAssignedTask`
  - [x] `create-task-library-item`
  - [x] `update-task-library-item`
  - [x] `delete-task-library-item`
- [x] **Update API Layer (`src/api/`)**:
  - [x] Updated relevant API functions to call respective Edge Functions.
  - [x] Implemented `updateStudentGoal` (direct RLS).
  - [x] Updated `taskLibrary.ts` CUD for EFs.
  - [x] Refactored `fetchAssignedTasks` to use RPC for reliable filtering.
- [x] **Update UI:**
  - [x] Connected Modals to working API/Edge Function flows.
  - [x] Added 'Admins' tab and integration.
  - [x] Created and integrated `AdminAdminDetailView`.
  - [x] Enabled delete buttons/logic.
  - [x] Enabled confirm buttons/logic for verification, assign task, adjust tickets, redeem reward.
  - [x] Implemented persistent student goals.
  - [x] Refactored Admin/Teacher task view to use `PaginatedTasksList`.
  - [x] Implemented Task Library features (Instruments, Files, URLs, Teacher Private).
  - [x] Added user self-edit feature (`EditMyInfoModal`) & integration.
  - [x] Refined `SharedHeader` logic for PIN logout and Edit Info button.
- [ ] **Security Hardening:**
  - [ ] Implement proper salting for `hashToken` function used for refresh tokens (in `claim-onetime-pin` and `refresh-pin-session`).
  - [ ] Consider implementing rolling refresh tokens in `refresh-pin-session`.
  - [ ] Final review and potential tightening of all RLS policies (post-feature completion).
- [ ] **Debugging & Known Issues:**
  - [ ] **TESTING:** Thoroughly test the custom refresh token flow (`claim-onetime-pin` -> storage -> `refresh-pin-session`) on web (manual refresh needed after >1hr) and eventually native.
  - [x] **MISSING FEATURE?:** Need a way for _any_ user who has set up email/password login (not using PIN) to change their email or password? Reuse/adapt `SetEmailPasswordModal` or integrate into `EditMyInfoModal`'s credential section? Call `update-auth-credentials`? _(Partially addressed via EditMyInfoModal)_
  - [x] **KNOWN LIMITATION (RLS - Names):** Teachers viewing task lists currently see "Assigned by: ID: <admin_id>" for tasks assigned by Admins. Accepted for now. Future fix: Relax RLS or use RPC.
  - [ ] **BLOCKER (Native Build/Runtime):** Native builds/runtime via Expo Go are blocked due to Node polyfill errors (`stream`, `events`, `https`, `net`) required by `ws`/`supabase-js`. **Awaiting official fix from Supabase.**

## Development Phase 4: Features, Refinements & Testing

- **[ ] Feature: Practice Streaks (#2):**
  - [ ] Decide on tracking method (Button, Timer, Task Completion).
  - [ ] Implement schema changes if needed (`practice_log` table?).
  - [ ] Create backend DB function (`calculate_streak`).
  - [ ] Add API endpoint (`fetchStudentStreak`).
  - [ ] Add UI display in `StudentView`.
- [ ] **Address Pending Decisions & Implement Chosen Features:** (Based on Dan Lefler's input from `SPECIFICATION.md` Section 10)
  - [x] Task Link URLs? (_Implemented via `reference_url`_).
  - [ ] Avatars?
  - [ ] Mandatory Reward Images?
  - [ ] Auto-Redemption Announcements?
  - [x] Finalize field requirements (descriptions, etc.).
  - [ ] Parent Reminders?
  - [x] Finalize Data Deletion Policy details (Cascade vs Set Null for `assigned_tasks`, `ticket_transactions`). _(Need to add FKs with chosen policy)_.
  - [x] Finalize PIN Login Identifier (Name? Username?) & Parent differentiation logic. _(Implicitly handled via PIN lookup)_.
  - [x] Offer Email/Password for Students/Parents too? _(Partially addressed via allowing credential setting)_.
- **[ ] Refinements & Thorough Testing:**
  - [ ] Test all user role workflows end-to-end, especially Task Library features and Self-Edit.
  - [ ] Refine UI/UX (including button styles, modal layouts - e.g., AssignTaskModal Step 2).
  - [ ] Add Foreign Key constraints with appropriate ON DELETE actions (CASCADE/SET NULL) for remaining relationships (e.g., `assigned_tasks` FKs, `ticket_transactions` FK). Create new migration(s).
  - [x] Add database indexes for common query patterns (review needed).
  - [x] Consider adding database-level checks (e.g., check constraints) for role consistency in link tables.
  - [-] Unit/integration tests (Optional).

## Supporting Features (Post-MVP / Lower Priority)

- [ ] Frontend: Design and implement `PublicView` welcome/landing page using provided store assets.
- [ ] Frontend: Evaluate and potentially implement opaque background images using provided assets.
