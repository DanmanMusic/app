# TODO: Project Development & Release

## Gemini Rules/Notes

- When requested to print out file content, provide the full content of the file while be mindful to inflate sections of code commented out during iterations.
- Absolute hard rule of no comments in any code. If code has comments please remove!
- Assume developers are experts but are open to suggestions for better libraries, approaches, or solutions to technical challenges.
- This project is in an early development phase. Backward compatibility is not a requirement (e.g., database schema changes are acceptable).

Remember to replace placeholders like `[ ]` with `[x]` as tasks are completed.

## [x] Development Phase 1: Frontend Prototyping & TQ/MSW Migration
*(All items previously checked remain checked)*
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

## [x] Development Phase 2: "Big Bang" Supabase Schema & Read/Basic-Write API Migration
*(Focus: Migrate DB structure and client-side reads/simple writes, defer complex/auth-dependent writes)*

- [x] **DB Schema:** Define and migrate schemas for all remaining core tables (`profiles`, `user_credentials`, `assigned_tasks`, `ticket_transactions`) and link tables (`student_instruments`, `student_teachers`, `parent_students`). Apply temporary permissive RLS policies. (`npx supabase db push`)
- [x] **Storage Buckets:** Create required public buckets (`instrument-icons`, `reward-icons`). Apply temporary permissive Storage RLS policies.
- [x] **Remove MSW:** Delete `src/mocks/`, `handlers.ts`, update `App.tsx`, `metro.config.js`, `package.json`.
- [x] **Refactor API Layer (`src/api/`)**:
    - [x] `instruments.ts` (CRUD + Storage)
    - [x] `rewards.ts` (CRUD + Storage)
    - [x] `taskLibrary.ts` (CRUD)
    - [x] `announcements.ts` (CRUD)
    - [x] `users.ts` (Reads for all roles, basic profile `updateUser`, `toggleUserStatus`. Deferred `createUser`, `deleteUser`, link table updates).
    *   [x] `stats.ts` (Read counts from DB).
    *   [x] `tickets.ts` (Read history/balance. Deferred `adjustTickets`, `redeemReward`).
    *   [x] `assignedTasks.ts` (Read tasks. Basic `createAssignedTask`. Deferred `updateAssignedTask` verification/points logic. Basic `deleteAssignedTask`).
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

## [ ] Development Phase 3: Authentication & Server-Side Logic

- [ ] **Implement Authentication:**
    - [ ] Backend: Define schema/logic for PIN hashing/storage/validation (`user_credentials`).
    - [ ] Backend: Create Supabase Edge Function (`login-with-pin`) for Student/Parent login.
    - [ ] Backend: Create Supabase Edge Function (`set-reset-pin`?) accessible by Admin/Teacher.
    - [ ] Frontend: Build PIN Login UI screen.
    - [ ] Frontend: Implement Email/Password login UI for Admin/Teacher (using Supabase Auth UI or custom).
    - [ ] Frontend: Refactor `AuthContext` to handle real Supabase sessions (JWTs, refresh tokens, user state).
    - [ ] Frontend: Remove `DevelopmentViewSelector` and related mock logic in `App.tsx`.
- [ ] **Implement Secure RLS:**
    - [ ] Replace ALL temporary permissive RLS policies on database tables (`profiles`, `assigned_tasks`, etc.) with strict, role-based policies (`USING (auth.uid() = ...)` , checks on roles).
    - [ ] Replace ALL temporary permissive RLS policies on Storage buckets (`instrument-icons`, `reward-icons`) with authenticated, role-based policies (e.g., only admins can write).
- [ ] **Implement Edge Functions for Deferred Actions:**
    - [ ] `createUser` (handle `auth.admin.createUser`, profile insert, link tables insert).
    - [ ] `deleteUser` (handle `auth.admin.deleteUser`, profile cascade should handle rest).
    - [ ] `verifyTask` (update `assigned_tasks`, calculate/award points, insert `ticket_transactions`, update balance atomically).
    - [ ] `assignTask` (handle insert into `assigned_tasks`).
    - [ ] `adjustTickets` (check validity, update balance, insert `ticket_transactions` atomically).
    - [ ] `redeemReward` (check balance, fetch cost, update balance, insert `ticket_transactions` atomically).
- [ ] **Update API Layer (`src/api/`)**:
    - [ ] Modify deferred functions (`createUser`, `deleteUser`, `adjustTickets`, `redeemReward`, `updateAssignedTask` verification part, `createAssignedTask`) to securely call the corresponding Edge Functions using `supabase.functions.invoke()`.
- [ ] **Update UI:**
    - [ ] Re-enable buttons in modals (`CreateUserModal`, `ManualTicketAdjustmentModal`, `RedeemRewardModal`, `AssignTaskModal`, `TaskVerificationModal`, `DeactivateOrDeleteUserModal` delete button).
    - [ ] Implement PIN management UI for Admin/Teacher.
- [ ] **Implement Link Table Logic:**
    - [ ] Refactor `updateUser` API or create dedicated Edge Functions/API calls to handle adding/removing rows in `student_instruments`, `student_teachers`, `parent_students` when editing users. Update `EditUserModal` accordingly.
    - [ ] Implement Admin UI for linking Parents <-> Students.

## [ ] Development Phase 4: Features, Refinements & Testing

- [ ] **Address Pending Decisions & Implement Chosen Features:** (Based on Dan Lefler's input from Phase 2 TODOs)
    *   [ ] Task Link URLs?
    *   [ ] Avatars?
    *   [ ] Mandatory Reward Images?
    *   [ ] Auto-Redemption Announcements?
    *   [ ] Challenge Feature?
    *   [ ] Finalize field requirements (descriptions, etc.).
    *   [ ] Parent Reminders?
    *   [ ] Finalize Data Deletion Policy details.
*   [ ] **Address Known Issues & TODOs:**
    *   [ ] Lint Errors.
    *   [ ] Dark Mode support.
    *   [ ] Ensure balance display is consistent and updates correctly after actions.
*   [ ] **Refinements & Thorough Testing:**
    *   Test all user role workflows end-to-end with real authentication and Supabase backend.
    *   Refine UI/UX based on testing.
    *   Optimize Supabase queries/functions/views if needed (e.g., for balance calculation, fetching linked data).
    *   Add unit/integration tests (Optional).

## [ ] Supporting Features (Post-MVP / Lower Priority)
*   [ ] Frontend: Design and implement `PublicView` welcome/landing page using provided store assets.
*   [ ] Frontend: Evaluate and potentially implement opaque background images using provided assets.