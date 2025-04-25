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

## [ ] Development Phase 2: Fixes, Remaining Features & API Refinements

### [ ] 1. Address Known Issues & TODOs from Refactor

    - [x] **Teacher Filtering:** Fixed API/MSW and component logic.
    - [x] **Admin View (Created Users):** Assumed fixed by TQ refactor. (Requires testing).
    - [x] **User Lookups:** Refactored components to remove `allUsers` prop; components fetch needed data or receive specific props.
    - [x] **API/MSW Handlers:** Necessary handlers/functions exist.
    - [x] **Pagination for Lookups:** Added `limit` param to fetch functions for fetching full lists.
    - [x] **UI Feedback:** Replaced `Alert.alert` with `react-native-toast-message`.
    - [ ] **Lint Errors:** Address remaining ESLint errors (unused vars, exhaustive-deps, empty interfaces, require imports). Run `npm run lint -- --fix`.
    - [x] **Role-Based Action Control (Teacher vs. Admin):** Implemented via optional props and conditional rendering in `AdminStudentDetailView`.
    - [ ] **Dark Mode:** Implement Dark Mode support (adjust colors, test components). *(Added from earlier discussion)*

### [ ] 2. Implement Remaining Mutations & Actions

    - [x] Assigned Task: Task Verification (`PATCH /api/assigned-tasks/:id` via `TaskVerificationModal`).
    - [x] Assigned Task: Re-assign (`POST /api/assigned-tasks` via `TaskVerificationModal`).
    - [x] Assigned Task: Assign Task (`POST /api/assigned-tasks` via `AssignTaskModal`).
    - [x] Tickets: Manual Adjustment (`POST /api/ticket-adjustments` via `ManualTicketAdjustmentModal`).
    - [x] Rewards: Redeem Reward (`POST /api/reward-redemptions` via `RedeemRewardModal`).
    - [ ] User Linking (Admin): Add UI controls (e.g., multi-select) in Create/Edit User Modals for linking Students <-> Teachers, Students <-> Instruments. Connect to `PATCH /api/users/:id`.

### [ ] 3. Implement Remaining Mock UI/Placeholders

    - [x] Teacher Detail View Placeholder replaced with basic implementation.
    - [x] Parent Detail View Placeholder replaced with basic implementation.
    - [ ] Teacher Detail View: Implement fetching/display of linked students. *(Partially done in placeholder, needs refinement)*
    - [ ] Parent Detail View: Implement fetching/display of linked students. *(Done)*
    - [ ] Teacher Action: View All Students button functionality (in `TeacherStudentsSection`).
    - [ ] Parent Action: Link Another Student button functionality (in `AdminParentDetailView` and `ParentView`).
    - [ ] Student Action: Rewards redemption flow/button (in `StudentView`).

### [ ] 4. Refinements & Testing

    - [ ] Thoroughly test all user role workflows after fixes.
    - [ ] Refine UI/UX based on testing (loading states, error messages, navigation, empty states).
    - [ ] Add unit/integration tests.

## [ ] Development Phase 3: Backend Development and Integration (Target: Supabase)

- [ ] Set up Supabase project.
- [ ] Define database schema in Supabase based on Data Models.
- [ ] Develop Supabase Edge Functions for complex logic (Verification, Redemption, Adjustments, Cascading Logic).
- [ ] Integrate Frontend with Supabase:
  - [ ] Install/Configure `supabase-js`.
  - [ ] Replace API client functions with `supabase-js` calls in TQ `queryFn`/`mutationFn`.
  - [ ] Implement real authentication (QR Code, Teacher/Admin login) using Supabase Auth. Update `AuthContext`.
  - [ ] Update pagination hooks for Supabase (`range`, filters).
  - [ ] Align TQ keys/invalidation with Supabase.
  - [ ] Remove MSW dependency and configuration.
- [ ] Optional: Implement Realtime updates, Push Notifications.

## [ ] Supporting Features

- [ ] Implement secure QR code generation and scanning.
- [ ] Implement QR code revocation/expiry on backend.
