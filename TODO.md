# TODO: Project Development & Release

## Gemini Rules/Notes
- When requested to print out file content, provide the full content of the file while be mindful to inflate sections of code commented out during iterations.
- Absolute hard rule of no comments in any code. If code has comments please remove!
- Assume developers are experts but are open to suggestions for better libraries, approaches, or solutions to technical challenges.
- This project is in an early development phase. Backward compatibility is not a requirement (e.g., database schema changes are acceptable).

Remember to replace placeholders like `[ ]` with `[x]` as tasks are completed.

## [x] Development Phase 1: Frontend Prototyping & TQ/MSW Migration
*(All items previously checked remain checked)*

## [x] Development Phase 2: "Big Bang" Supabase Schema & Read/Basic-Write API Migration
*(All items previously checked remain checked)*

## [x] Development Phase 3: Authentication & Server-Side Logic

- [x] **Implement Authentication:**
    - [x] Backend: Define schema/logic for PIN storage/validation (`onetime_pins`, `active_refresh_tokens`).
    - [x] Backend: Create Supabase Edge Function (`claim-onetime-pin`).
    - [x] Backend: Create Supabase Edge Function (`generate-onetime-pin`).
    - [x] Frontend: Build PIN Login UI (`LoginModal.tsx`).
    - [x] Frontend: Implement Email/Password login UI (`LoginModal.tsx`).
    - [x] Frontend: Refactor `AuthContext` for real Supabase sessions.
    - [x] Frontend: Implement Client-Side Custom PIN Refresh Logic (`AuthContext`). *(Workaround in place for Chrome)*.
    *   [x] Frontend: Integrate `LoginModal` into `App.tsx`. *(Works, Chrome refresh/logout has workarounds)*.
*   [x] **Implement Secure RLS:**
    *   [x] Apply secure RLS policies for Storage buckets (`instrument-icons`, `reward-icons`).
    *   [x] Define `is_admin()` helper function.
    *   [x] Apply secure RLS policies for DB tables (`rewards`, `announcements`, `profiles`, `instruments`, `task_library`, `assigned_tasks`, `student_instruments`, `student_teachers`, `parent_students`, `ticket_transactions`).
    *   [x] Restrict sensitive auth tables (`onetime_pins`, `active_refresh_tokens`, `user_credentials`) to service_role access only (no client policies).
    *   [x] Created `can_student_or_parent_mark_task_complete()` helper function for RLS.
    *   [x] Resolved RLS recursion issues on `assigned_tasks` and `profiles` updates.
*   [x] **Implement Edge Functions for Core Auth/User Management:**
    *   [x] `createUser` (handle `auth.admin.createUser`, profile insert, student links).
    *   [x] `generate-onetime-pin`.
    *   [x] `claim-onetime-pin`.
    *   [x] `refresh-pin-session`.
    *   [x] `update-auth-credentials`.
    *   [x] `get-user-auth-details`.
    *   [x] `deleteUser` (incl. protected admin check).
    *   [x] `updateUserWithLinks` (handles profile & link tables, respects Teacher permissions).
    *   [x] `toggleUserStatus` (moved from client API to EF due to RLS recursion).
*   [x] **Implement Edge Functions for Core Workflow Actions:**
    *   [x] `assignTask` (Admin/Teacher assign).
    *   [x] `verifyTask` (Admin/Teacher verify, includes transaction log insert).
    *   [x] `adjustTickets` (Admin manual adjustment, includes transaction log insert).
    *   [x] `redeemReward` (Admin redemption, includes transaction log insert, uses RPC).
    *   [x] `deleteAssignedTask` (Admin/Teacher delete unverified).
*   [x] **Update API Layer (`src/api/`)**:
    *   [x] Updated `createUser`, `generatePinForUser`, `claimPin`, `refreshPinSession`, `updateAuthCredentials`, `fetchAuthUser`, `updateUser`, `toggleUserStatus`, `deleteUser`, `createAssignedTask`, `updateAssignedTask` (for verify), `deleteAssignedTask`, `adjustTickets`, `redeemReward` to call respective Edge Functions.
*   [x] **Update UI:**
    *   [x] Connected Modals (`CreateUser`, `GeneratePin`, `Login`, `SetCredentials`, `EditUser`, `DeactivateOrDeleteUser`, `AssignTask`, `TaskVerification`, `ManualTicketAdjustment`, `RedeemReward`) to working API/Edge Function flows.
    *   [x] Added 'Admins' tab and integration.
    *   [x] Created and integrated `AdminAdminDetailView`.
    *   [x] Enabled delete button in `DeactivateOrDeleteUserModal`.
    *   [x] Enabled confirm buttons/logic for verification, assign task, adjust tickets, redeem reward.
    *   [x] Fixed `EditUserModal` pre-selection issue.
    *   [x] Fixed UI state sync issue for "Mark Complete" button.
*   [ ] **Implement Link Table Logic (Admin Parent-Student Linking):**
    *   [ ] Design and implement Admin UI for linking Parents <-> Students.
    *   [ ] Create necessary API/Edge Function (or use generic Admin update) to manage `parent_students` table entries.
*   [ ] **Security Hardening:**
    *   [ ] Implement proper salting for `hashToken` function used for refresh tokens (in `claim-onetime-pin` and `refresh-pin-session`).
    *   [ ] Consider implementing rolling refresh tokens in `refresh-pin-session`.
    *   [ ] Final review and potential tightening of all RLS policies (post-feature completion).
*   [ ] **Debugging & Known Issues:**
    *   [ ] **BUG:** Investigate/Monitor Chrome/Expo Web session refresh/logout behavior. Current workarounds (`signOut({ scope: 'local' })`, decoupled profile fetch in `AuthContext`) seem stable but root cause in `supabase-js` or environment interaction remains. *(GitHub Issue #1401 Created)*.
    *   [ ] **TODO:** Refactor `verifyTask` and potentially `adjustTickets`/`redeemReward` Edge Functions to use atomic PostgreSQL RPC functions instead of sequential DB calls for maximum data integrity.
    *   [ ] **TODO:** Refactor `get_student_balance` RPC to potentially use a dedicated balance column on `profiles` (updated by triggers/functions) instead of summing transactions, for performance if history grows large.
    *   [ ] **TODO:** Add more specific RLS `WITH CHECK` clauses to Student/Parent `assigned_tasks` update policy (`Student/Parent Update - Mark Complete Via Function`) to prevent modification of other fields besides `is_complete`, `completed_date`, `verification_status`, once core functionality is stable.
    *   [x] **BUG:** Fix "Text strings must be rendered within a <Text> component" warning. *(Fixed)*.
    *   [x] **BUG:** Fix `AdminView` resetting to 'Dashboard' tab on refocus. *(Fixed by stabilizing AuthContext loading state)*.


## [ ] Development Phase 4: Features, Refinements & Testing
*(Dependent on resolving/stabilizing Phase 3 issues)*
- [ ] **Address Pending Decisions & Implement Chosen Features:** (Based on Dan Lefler's input from `SPECIFICATION.md` Section 10)
    *   [ ] Task Link URLs?
    *   [ ] Avatars?
    *   [ ] Mandatory Reward Images?
    *   [ ] Auto-Redemption Announcements?
    *   [ ] Challenge Feature?
    *   [ ] Finalize field requirements (descriptions, etc.).
    *   [ ] Parent Reminders?
    *   [ ] Finalize Data Deletion Policy details (Cascade vs Set Null for `assigned_tasks`, `ticket_transactions`). *(Need to add FKs with chosen policy)*.
    *   [ ] Finalize PIN Login Identifier (Name? Username?) & Parent differentiation logic.
    *   [ ] Offer Email/Password for Students/Parents too?
*   [ ] **Refinements & Thorough Testing:**
    *   [ ] Test all user role workflows end-to-end.
    *   [ ] Refine UI/UX (including button styles).
    *   [ ] Add Foreign Key constraints with appropriate ON DELETE actions (CASCADE/SET NULL) for remaining relationships (e.g., `assigned_tasks` FKs, `ticket_transactions` FK). Create new migration(s).
    *   [ ] Add database indexes for common query patterns (e.g., filtering tasks by status/teacher/student). *(Some added, review needed)*.
    *   [ ] Consider adding database-level checks (e.g., check constraints) to ensure role consistency in link tables if not handled sufficiently by app logic/RLS.
    *   [ ] Unit/integration tests (Optional).

## [ ] Supporting Features (Post-MVP / Lower Priority)
*   [ ] Frontend: Design and implement `PublicView` welcome/landing page using provided store assets.
*   [ ] Frontend: Evaluate and potentially implement opaque background images using provided assets.