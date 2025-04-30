# TODO: Project Development & Release

## Gemini Rules/Notes

- When requested to print out file content, provide the full content of the file while be mindful to inflate sections of code commented out during iterations.
- Absolute hard rule of no comments in any code. If code has comments please remove!
- Assume developers are experts but are open to suggestions for better libraries, approaches, or solutions to technical challenges.
- This project is in an early development phase. Backward compatibility is not a requirement (e.g., database schema changes are acceptable).

Remember to replace placeholders like `[ ]` with `[x]` as tasks are completed.

## [x] Development Phase 1: Frontend Prototyping & TQ/MSW Migration

_(All items previously checked remain checked)_

## [x] Development Phase 2: "Big Bang" Supabase Schema & Read/Basic-Write API Migration

_(All items previously checked remain checked)_

## [In Progress] Development Phase 3: Authentication & Server-Side Logic

- [ ] **Implement Authentication:**
  - [x] Backend: Define schema/logic for PIN storage/validation (`onetime_pins`, `active_refresh_tokens`). Remove old `pin_hash`. Updated `onetime_pins` role constraint.
  - [x] Backend: Create Supabase Edge Function (`claim-onetime-pin`) for Student/Parent/Admin/Teacher login.
  - [x] Backend: Create Supabase Edge Function (`generate-onetime-pin`) accessible by Admin/Teacher (Supports all roles).
  - [x] Frontend: Build PIN Login UI screen (within `LoginModal.tsx`).
  - [x] Frontend: Implement Email/Password login UI for Admin/Teacher (within `LoginModal.tsx`). Call `supabase.auth.signInWithPassword`.
  - [x] Frontend: Refactor `AuthContext` to handle real Supabase sessions (JWTs, refresh tokens, user state). (Removed mock state).
  - [x] Frontend: Implement Client-Side Refresh Token Logic (via `onAuthStateChange` in `AuthContext`). _(Temporarily disabled for debugging)_
  - [ ] Frontend: Restore custom PIN refresh logic in `AuthContext` once browser refresh issue is resolved.
  - [ ] Frontend: Integrate `LoginModal` into `App.tsx` and trigger from `PublicView`. _(Done, but refresh behavior needs fix)_.
- [ ] **Implement Secure RLS:**
  - [x] Apply secure RLS policies for Storage buckets (`instrument-icons`, `reward-icons`) using `is_admin()` helper.
  - [x] Define `is_admin()` helper function in database.
  - [x] Apply secure RLS policies for DB tables (`rewards`, `announcements`, `profiles`).
  - [ ] Replace ALL remaining temporary permissive RLS policies on database tables (`assigned_tasks`, link tables, `onetime_pins`, `active_refresh_tokens`, etc.) with strict, role-based policies.
- [ ] **Implement Edge Functions for Core Auth/User Management:**
  - [x] `createUser` (handle `auth.admin.createUser`, profile insert, student links - NO PIN). Deployed & Integrated.
  - [x] `generate-onetime-pin` (generate & store temporary PIN for any role). Deployed & Integrated w/ Admin/Teacher UI.
  - [x] `claim-onetime-pin` (validate PIN, gen tokens w/ correct role, store refresh hash). Deployed & Integrated w/ LoginModal.
  - [x] `refresh-pin-session` (validate refresh token, gen new access token). Deployed. _(Integration temporarily disabled in AuthContext)_.
  - [x] `update-auth-credentials` (allow user to set email/password). Deployed. Integrated w/ UI.
  - [x] `get-user-auth-details` (securely fetch email for Admin views). Deployed & Integrated.
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
  - [x] Add `refreshPinSession` API to call Edge Function. _(Usage temporarily disabled in AuthContext)_.
  - [x] Add `updateAuthCredentials` API to call Edge Function.
  - [x] Refactor `fetchAuthUser` API to call Edge Function.
  - [ ] Update `deleteUser` API to call Edge Function.
  - [ ] Update `assignTask`, `verifyTask` (part of `updateAssignedTask`), `adjustTickets`, `redeemReward` API functions to call respective Edge Functions once created.
- [ ] **Update UI:**
  - [x] Connect `CreateUserModal` to working `createUser` flow.
  - [x] Connect `GeneratePinModal` to working `generatePinForUser` flow.
  - [x] Connect `LoginModal` (PIN) to working `claimPin` flow.
  - [x] Connect `LoginModal` (Email) to working `signInWithPassword` flow.
  - [x] Build Settings UI to call `updateAuthCredentials` (via `SetEmailPasswordModal` integrated into `StudentView`, `TeacherView`, `ParentView`, `AdminView`).
  - [x] Add 'Admins' tab to `AdminUsersSection` and hook integration.
  - [x] Create and integrate `AdminAdminDetailView` with conditional PIN button.
  - [ ] Re-enable delete button in `DeactivateOrDeleteUserModal` to call `deleteUser` API.
  - [ ] Re-enable buttons/logic for deferred actions (Task Verification points/reassign, Assign Task confirm, Ticket Adjust confirm, Redeem Reward confirm) once Edge Functions are ready.
- [ ] **Implement Link Table Logic:**
  - [ ] Refactor `updateUser` API/Edge Function OR create dedicated functions to handle adding/removing rows in `student_instruments`, `student_teachers`, `parent_students` when editing users. Update `EditUserModal` accordingly.
  - [ ] Implement Admin UI for linking Parents <-> Students.
- [ ] **Security Hardening:**
  - [ ] Implement proper salting for `hashToken` function used for refresh tokens.
  - [ ] Consider implementing rolling refresh tokens in `refresh-pin-session`.
  - [ ] Review and tighten all RLS policies.
- [ ] **Debugging:**
  - [ ] **BUG:** Fix "Text strings must be rendered within a <Text> component" warning appearing in Expo Go (likely within AdminView section components).
  - [ ] **BUG:** Investigate and fix issue where session doesn't load correctly on browser refresh/tab refocus (specifically Chrome, possibly others) - currently hangs on "Loading Session...". _(Custom refresh logic temporarily disabled)_.

## [ ] Development Phase 4: Features, Refinements & Testing

_(Dependent on resolving Phase 3 issues)_

- [ ] **Address Pending Decisions & Implement Chosen Features:** (Based on Dan Lefler's input from Phase 2 TODOs)
  - [ ] Task Link URLs?
  - [ ] Avatars?
  - [ ] Mandatory Reward Images?
  - [ ] Auto-Redemption Announcements?
  - [ ] Challenge Feature?
  - [ ] Finalize field requirements (descriptions, etc.).
  - [ ] Parent Reminders?
  - [ ] Finalize Data Deletion Policy details.

* [ ] **Address Known Issues & TODOs:**
  - [ ] Lint Errors.
  - [ ] Dark Mode support.
  - [ ] Ensure balance display is consistent and updates correctly after actions (requires atomic functions).
  - [ ] Review parent `viewing_student_id` logic during session refresh (especially standard refresh).
* [ ] **Refinements & Thorough Testing:**
  - Test all user role workflows end-to-end with real authentication and Supabase backend.
  - Refine UI/UX based on testing (including button styles).
  - Optimize Supabase queries/functions/views if needed (e.g., for balance calculation, fetching linked data).
  - Add unit/integration tests (Optional).

## [ ] Supporting Features (Post-MVP / Lower Priority)

- [ ] Frontend: Design and implement `PublicView` welcome/landing page using provided store assets.
- [ ] Frontend: Evaluate and potentially implement opaque background images using provided assets.
- [ ] Refine button styles (wood grain, abalone border).
