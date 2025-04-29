# TODO: Project Development & Release

## Gemini Rules/Notes

- When requested to print out file content, provide the full content of the file while be mindful to inflate sections of code commented out during iterations.
- Absolute hard rule of no comments in any code. If code has comments please remove!
- Assume developers are experts but are open to suggestions for better libraries, approaches, or solutions to technical challenges.
- This project is in an early development phase. Backward compatibility is not a requirement (e.g., database schema changes are acceptable).

Remember to replace placeholders like `[ ]` with `[x]` as tasks are completed.

## [x] Development Phase 1: Frontend Prototyping & TQ/MSW Migration
*(All items previously checked remain checked)*
- ... (Previous items remain checked) ...
- [x] Refactor Views (`PublicView`, `StudentView`, `ParentView`, `TeacherView`, `AdminView`) to use TQ Hooks/Mutations instead of `DataContext` (excluding DevSelector)
- [x] Refactor Modals (`TaskVerificationModal`, `AssignTaskModal`, `CreateUserModal`, `EditUserModal`, `SetGoalModal`, etc.) to fetch own data/use internal mutations.
- [x] Remove `DataContext` provider and most of its state/logic.
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
*(All items previously checked remain checked)*
- ... (Previous items remain checked) ...
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

## [In Progress] Development Phase 3: Authentication & Server-Side Logic

- [ ] **Implement Authentication:**
    - [x] Backend: Define schema/logic for PIN storage/validation (`onetime_pins`, `active_refresh_tokens`). Remove old `pin_hash`.
    - [ ] Backend: Create Supabase Edge Function (`login-with-pin`) for Student/Parent login. --> RENAMED to `claim-onetime-pin`
    - [ ] Backend: Create Supabase Edge Function (`set-reset-pin`?) accessible by Admin/Teacher. --> RENAMED to `generate-onetime-pin`
    - [x] Frontend: Build PIN Login UI screen (within `LoginModal.tsx`).
    - [x] Frontend: Implement Email/Password login UI for Admin/Teacher (within `LoginModal.tsx`). Call `supabase.auth.signInWithPassword`.
    - [ ] Frontend: Refactor `AuthContext` to handle real Supabase sessions (JWTs, refresh tokens, user state). *(Partially done by using `setMockAuthState` with real IDs/roles, but full session management pending).*
    - [x] Frontend: Restore `DevelopmentRoleSelector` using live Supabase data. Remove forced Admin login button.
    - [x] Frontend: Integrate `LoginModal` into `App.tsx` and trigger from `PublicView`.
- [ ] **Implement Secure RLS:**
    - [x] Apply secure RLS policies for Storage buckets (`instrument-icons`, `reward-icons`) using `is_admin()` helper.
    - [x] Define `is_admin()` helper function in database.
    - [x] Apply secure RLS policies for DB tables (`rewards`, `announcements`).
    - [ ] Replace ALL remaining temporary permissive RLS policies on database tables (`profiles`, `assigned_tasks`, `onetime_pins`, `active_refresh_tokens`, link tables, etc.) with strict, role-based policies.
- [ ] **Implement Edge Functions for Core Auth/User Management:**
    - [x] `createUser` (handle `auth.admin.createUser`, profile insert, student links - NO PIN). Deployed & Integrated.
    - [x] `generate-onetime-pin` (generate & store temporary PIN). Deployed & Integrated w/ Admin/Teacher UI.
    - [x] `claim-onetime-pin` (validate PIN, gen tokens, store refresh hash). Deployed & Integrated w/ LoginModal. **Requires client refresh logic.**
    - [x] `refresh-pin-session` (validate refresh token, gen new access token). Deployed. **Requires client refresh logic.**
    - [x] `update-auth-credentials` (allow user to set email/password). Deployed. **Requires client UI.**
    - [x] `deleteUser` (handle `auth.admin.deleteUser`). Deployed. **Requires client UI integration.**
- [ ] **Implement Edge Functions for Deferred Actions:**
    - [ ] `verifyTask` (update `assigned_tasks`, award points, insert `ticket_transactions`, update balance atomically).
    - [ ] `assignTask` (replace client-side attempt with function call for consistency/validation).
    - [ ] `adjustTickets` (check validity, update balance, insert `ticket_transactions` atomically).
    - [ ] `redeemReward` (check balance, fetch cost, update balance, insert `ticket_transactions` atomically).
- [ ] **Update API Layer (`src/api/`)**:
    - [x] Modify `createUser` API to call Edge Function.
    - [x] Add `generatePinForUser` API to call Edge Function.
    - [x] Add `claimPin` API to call Edge Function.
    - [x] Add `refreshPinSession` API to call Edge Function.
    - [ ] Add `updateAuthCredentials` API to call Edge Function.
    - [ ] Update `deleteUser` API to call Edge Function.
    - [ ] Update `assignTask`, `verifyTask` (part of `updateAssignedTask`), `adjustTickets`, `redeemReward` API functions to call respective Edge Functions once created.
- [ ] **Update UI:**
    - [x] Connect `CreateUserModal` to working `createUser` flow.
    - [x] Connect `GeneratePinModal` to working `generatePinForUser` flow.
    - [x] Connect `LoginModal` (PIN) to working `claimPin` flow.
    - [x] Connect `LoginModal` (Email) to working `signInWithPassword` flow.
    - [ ] Implement Client-Side Refresh Token Logic (e.g., using `onAuthStateChange` or interceptors) to call `refreshPinSession`.
    - [ ] Build Settings UI to call `updateAuthCredentials`.
    - [ ] Re-enable delete button in `DeactivateOrDeleteUserModal` to call `deleteUser` API.
    - [ ] Re-enable buttons/logic for deferred actions (Task Verification points/reassign, Assign Task confirm, Ticket Adjust confirm, Redeem Reward confirm) once Edge Functions are ready.
- [ ] **Implement Link Table Logic:**
    - [ ] Refactor `updateUser` API/Edge Function OR create dedicated functions to handle adding/removing rows in `student_instruments`, `student_teachers`, `parent_students` when editing users. Update `EditUserModal` accordingly.
    - [ ] Implement Admin UI for linking Parents <-> Students.
- [ ] **Security Hardening:**
    *   [ ] Implement proper salting for `hashToken` function used for refresh tokens.
    *   [ ] Consider implementing rolling refresh tokens in `refresh-pin-session`.
    *   [ ] Review and tighten all RLS policies.

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
    *   [ ] Ensure balance display is consistent and updates correctly after actions (requires atomic functions).
    *   [ ] Review parent `viewing_student_id` logic during session refresh.
*   [ ] **Refinements & Thorough Testing:**
    *   Test all user role workflows end-to-end with real authentication and Supabase backend.
    *   Refine UI/UX based on testing (including button styles).
    *   Optimize Supabase queries/functions/views if needed (e.g., for balance calculation, fetching linked data).
    *   Add unit/integration tests (Optional).

## [ ] Supporting Features (Post-MVP / Lower Priority)
*   [ ] Frontend: Design and implement `PublicView` welcome/landing page using provided store assets.
*   [ ] Frontend: Evaluate and potentially implement opaque background images using provided assets.
*   [ ] Refine button styles (wood grain, abalone border).