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

- [x] Implement Authentication (Backend, Frontend, Context)
- [x] Implement Secure RLS (Storage, DB Tables, Helpers)
- [x] Implement Edge Functions for Core Auth/User Management
- [x] Implement Edge Functions for Core Workflow Actions
- [x] Update API Layer to use Edge Functions/RPC
- [x] Update UI Components/Views/Modals to use TQ/EFs
- [x] Refactor Edge Functions to use Shared Helpers (_Completed_)

- **[ ] Security Hardening:**
  - [x] Implement proper salting for `hashToken` function used for refresh tokens. (_Completed_)
  - [ ] Consider implementing rolling refresh tokens in `refresh-pin-session`.
  * [ ] Final review and potential tightening of all RLS policies (post-feature completion).

* **[ ] Debugging & Known Issues:**
  - [ ] **TESTING:** Thoroughly test the custom refresh token flow (`claim-onetime-pin` -> storage -> `refresh-pin-session`) on web (manual refresh needed after >1hr) and eventually native.
  - [ ] **BLOCKER (Native Build/Runtime):** Native builds/runtime via Expo Go are blocked due to Node polyfill errors (`stream`, `events`, `https`, `net`) required by `ws`/`supabase-js`. **Awaiting official fix from Supabase.**

## Development Phase 4: Features, Refinements & Testing

- **[ ] Feature: Practice Streaks (#2):**
  - [ ] Decide on tracking method (Button, Timer, Task Completion).
  - [ ] Implement schema changes if needed (`practice_log` table?).
  - [ ] Create backend DB function (`calculate_streak`).
  - [ ] Add API endpoint (`fetchStudentStreak`).
  - [ ] Add UI display in `StudentView`.
- **[ ] Address Pending Decisions & Implement Chosen Features:** (Based on Dan Lefler's input from `SPECIFICATION.md` Section 10)
  - [ ] Avatars?
  - [ ] Mandatory Reward Images?
  - [ ] Auto-Redemption Announcements?
  - [ ] Parent Reminders?
- **[ ] Refinements & Thorough Testing:**
  - [x] Add Foreign Key constraints with appropriate ON DELETE actions (CASCADE/SET NULL). (_Completed via SQL Editor, needs migration file update before final deploy_)
  - **[ ] NEW:** Update original migration files (`..._create_assigned_tasks_table.sql`, `..._create_ticket_transactions_table.sql`, etc.) to include FKs and integrated helper functions before final deployment to new project.
  - **[ ] NEW:** Test user deletion cascade logic thoroughly (Admin, Teacher, Student, Parent). Verify related data (profiles, tasks, transactions, links) is handled correctly per `ON DELETE` rules.
  - **[ ] NEW:** Test user deactivation (`toggleUserStatus`) logic. Verify inactive users cannot log in. Check impact on linked data visibility (e.g., do inactive teachers still show as assigners/verifiers? Do inactive students appear in lists unless 'all' filter is used?). Specifically test Teacher deactivation impact on student linking/visibility.
  - **[ ] NEW:** Populate with more realistic data volumes and test pagination across all relevant lists (Admin users, tasks; Teacher students, tasks; Student tasks, history). Verify performance and UI responsiveness.
  - [ ] Test all user role workflows end-to-end, especially Task Library features (including ad-hoc attachments) and Self-Edit.
  - [ ] Refine UI/UX (including button styles, modal layouts - e.g., AssignTaskModal Step 2).
  - [ ] Consider adding database-level checks (e.g., check constraints) for role consistency in link tables.
  - [ ] Unit/integration tests (Optional).

## Supporting Features (Post-MVP / Lower Priority)

- [ ] Frontend: Design and implement `PublicView` welcome/landing page using provided store assets.
- [ ] Frontend: Evaluate and potentially implement opaque background images using provided assets.
