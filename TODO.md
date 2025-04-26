# TODO: Project Development & Release

## Gemini Rules/Notes

- When requested to print out file content, provide the full content of the file while be mindful to inflate sections of code commented out during iterations.
- Absolute hard rule of no comments in any code. If code has comments please remove!
- Assume developers are experts but are open to suggestions for better libraries, approaches, or solutions to technical challenges.
- This project is in an early development phase. Backward compatibility is not a requirement (e.g., database schema changes are acceptable).

Remember to replace placeholders like `[ ]` with `[x]` as tasks are completed.

## [x] Development Phase 1: Frontend Prototyping & TQ/MSW Migration

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

## [ ] Development Phase 2: Fixes, Remaining Features & API Refinements (Pre-Supabase)

### [ ] 1. Pending Decisions & Actions (Input: Dan Lefler)

*   [ ] **Provide Assets:** Supply storefront, interior, and lesson room photos (See SPECIFICATION.md Section 9).
    *   _(Example: Needed for the public welcome screen design)._
*   [ ] **Decide: Task Link URL:** Implement optional URL field for tasks?
    *   _(Example: Should teachers be able to add a link like `https://www.ultimateguitar.com/tabs/1234` to a "Learn Song X" task?)._
*   [ ] **Decide: Image Needs:**
    *   Instruments (DB vs hardcoded)? _(Example: Show actual pictures of instruments available as rewards, or just generic icons like now?)._
    *   Avatars (which roles)? _(Example: Allow students and/or teachers to upload profile pictures?)._
    *   Mandatory Reward images? _(Example: Is it okay if some rewards, like a 'Snickers Bar', don't have a specific image uploaded?)._
*   [ ] **Decide: Auto-Redemption Announcements:** Implement? Definition of significant? Message format?
    *   _(Example: When a student redeems the 'Fender Stratocaster' (cost 10000), should an announcement automatically appear saying "🎉 Alice redeemed a Fender Stratocaster! 🎉"? Or only if Admin manually creates it?)._
*   [ ] **Decide: Challenge Feature:** Go/No-Go for V1?
    *   _(Example: Should teachers be able to post 'challenges' like "Learn 3 new scales this month for 50 bonus tickets" that *any* relevant student can choose to accept and attempt?)._
    *   _If Go:_ Decide Targeting Rules (Teacher A challenges Teacher B's students?), Expiry (Challenges end?), UI differentiation (Challenge tasks look different?), Assignment Attribution (Who assigned it if student accepts?).
*   [ ] **Decide: Field Requirements:**
    *   Necessity of descriptions (Tasks, Rewards)? _(Example: Is just 'Practice 15 mins' enough, or do we need the extra description text field? Same for rewards?)._
    *   Finalize Announcement fields/types. _(Example: Is the 'message' field always needed? Are 'announcement', 'challenge', 'redemption' types enough?)._
*   [ ] **Decide: Student Identifier for PIN Login:** Choose method. (PIN login *method* is set, but what do they type *with* the PIN?)
    *   _(Example: How does a student identify themselves with their PIN? By typing `Alice Wonder` + PIN, or `alice.w` + PIN, or `alice.wonder@email.com` + PIN?)._
*   [ ] **Decide: Parent Login Context:** Confirm differentiation logic. (Assumes parent uses child's ID/PIN).
    *   _(Example: If Mom Wonder logs in using `Alice Wonder` + Alice's PIN, how does the app confirm she's a Parent to show the Parent view? Does the backend check linked parents during login?)._
*   [ ] **Decide: Additional Login Methods:** Offer Email/Password for Students/Parents too?
    *   _(Example: Should students *also* be able to set an email/password to log in, as an alternative to their Identifier+PIN? What about Parents having their own separate email/password login instead of using child credentials?)._
*   [ ] **Decide: Parent Reminders Feature:** Go/No-Go for V1? (If Go, provide detailed specs).
    *   _(Example: Should parents have a button like "Nudge Alice about 'Practice Scales'" that shows a reminder in Alice's app?)._
*   [ ] **Decide: Data Deletion Policy:** Cascade delete or anonymize student tasks/history?
    *   _(Example: If Admin deletes student 'Bob', should all records of tasks Bob completed and tickets he earned disappear forever, or should they remain but just say 'Deleted Student' instead of 'Bob'?).

### [ ] 2. Address Known Issues & TODOs

*   [ ] **Lint Errors:** Address remaining ESLint errors (unused vars, exhaustive-deps, empty interfaces, require imports). Run `npm run lint -- --fix`.
*   [ ] **Dark Mode:** Implement Dark Mode support (adjust colors, test components).
*   [ ] **Admin View (Created Users):** Test if new users appear correctly after creation (post TQ refactor).
*   [ ] **Role-Based Action Control:** Fully review/implement remaining permission checks (e.g., ensure teachers cannot perform admin-only actions even if UI is similar).
*   [ ] **User Linking (Admin):** Add UI controls (e.g., multi-select) in Create/Edit User Modals for linking Students <-> Teachers, Students <-> Instruments. (Connect to `PATCH /api/users/:id` or Supabase equivalent later).
*   [ ] **Balance in Modals:** Update `ManualTicketAdjustmentModal` and `RedeemRewardModal` in Admin/Teacher views to fetch/use the *actual* current balance instead of defaulting to 0.

### [ ] 3. Implement Remaining Mock UI/Placeholders

*   [ ] **Student Action:** Implement Rewards redemption flow/button in `StudentView`. Needs to connect to `RedeemRewardModal` or similar flow.
*   [ ] **Parent Action:** Add mock "Link Another Student" button functionality/alert in `ParentView`.
*   [ ] **Teacher Action:** Add mock "View All Students" button functionality/alert in `TeacherStudentsSection`.

### [ ] 4. Refinements & Testing

*   [ ] Thoroughly test all user role workflows with MSW.
*   [ ] Refine UI/UX based on testing (loading states, error messages, navigation, empty states, scrollability nuances).
*   [ ] Add basic unit/integration tests (Optional for V1).

## [ ] Development Phase 3: Backend Development and Integration (Target: Supabase)

*   [ ] Set up Supabase project & define initial schema based on SPECIFICATION.md (using CLI migrations).
*   [ ] Install & Configure `supabase-js` client (`src/lib/supabaseClient.ts`).
*   [ ] **Implement Authentication:**
    *   [ ] Backend: Implement secure PIN hashing/storage (`user_credentials` table).
    *   [ ] Backend: Create `login-with-pin` Edge Function (validates PIN, generates JWT).
    *   [ ] Backend: Create `set-student-pin` Edge Function (Admin use).
    *   [ ] Frontend: Create PIN Login UI.
    *   [ ] Frontend: Update `AuthContext` to use Supabase sessions & PIN login flow.
    *   [ ] Frontend: Implement Admin/Teacher email/password login UI & flow.
*   [ ] **Integrate Data Fetching:**
    *   [ ] Replace `src/api/` functions & TQ `queryFn`s with `supabase-js` calls (e.g., `fetchInstruments`, `fetchUsers`, etc.).
    *   [ ] Update pagination hooks (`usePaginated*`) for Supabase (`range`, filters).
*   [ ] **Integrate Mutations:**
    *   [ ] Replace `fetch` calls in TQ `mutationFn`s with Supabase client methods (`insert`, `update`, `delete`).
    *   [ ] Develop Supabase Edge Functions for complex logic (Verification, Redemption, Adjustments, potential auto-announcements, Cascading Logic on delete).
*   [ ] **Implement Storage:** (If images/avatars are decided upon)
    *   [ ] Set up Supabase Storage Buckets.
    *   [ ] Implement file upload logic.
    *   [ ] Update UI to display images using generated URLs.
*   [ ] **Implement Features based on Decisions:** (Challenges, Task Links, Avatars, etc.)
*   [ ] **Remove MSW:** Uninstall dependency, remove handlers, setup files, `metro.config.js` shims.
*   [ ] Define and Implement RLS policies for all tables.
*   [ ] Optional: Implement Realtime updates, Push Notifications.

## [ ] Supporting Features (Post-MVP / Lower Priority)

*   [ ] Frontend: Design and implement `PublicView` welcome/landing page using provided store assets.
*   [ ] Frontend: Evaluate and potentially implement opaque background images using provided assets.