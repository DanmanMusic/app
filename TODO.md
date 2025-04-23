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
    - [ ] **Teacher Filtering:** Fix client-side filtering placeholders in `TeacherView`/`TeacherDashboardSection`/`TeacherStudentsSection`. Requires either:
        - [ ] Enhancing API/MSW (`fetchStudents`, `fetchAssignedTasks`) to accept `teacherId` for filtering OR return full `User` objects with `linkedTeacherIds`.
        - [ ] Creating dedicated endpoints (e.g., `/api/teachers/:id/students`, `/api/teachers/:id/pending-verifications`).
    - [ ] **Admin View:** Fix "View Details" for newly created users (ensure `AdminStudentDetailView` gets correct data/state updates post-creation - should be fixed by removing context dependency, needs testing).
    - [ ] **User Lookups:** Ensure components needing user names (e.g., `AdminStudentDetailView` for linked teachers, potentially `TaskVerificationModal`) fetch required data or receive necessary lists (e.g., `teachers`) via props. Remove `allUsers` prop where feasible.
    - [ ] **API/MSW Handlers:**
        - [ ] Add `fetchAllUsers` function (`/api/users/all` handler already added).
        - [ ] Add `fetchUserById` function (or continue using direct `fetch` in `useQuery`).
        - [ ] Add MSW handlers for Stats API (`/api/stats/user-counts`, `/api/assigned-tasks/stats`).
    - [ ] **Pagination:** Review `fetch*` calls using `page: 1` where full lists are needed (e.g., `fetchStudents` in `TeacherView` for lookups/filtering) and implement proper pagination or fetching of all required items.
    - [ ] **UI Feedback:** Replace remaining `Alert.alert` calls (especially in mutation `onError`) with better UI feedback (e.g., Toasts, inline messages).
    - [ ] **Lint Errors:** Address remaining ESLint errors (unused vars, exhaustive-deps, empty interfaces, require imports).

### [ ] 2. Implement Remaining Mutations & Actions
    - [ ] Assigned Task: Task Verification (`PATCH /api/assigned-tasks/:id` via `TaskVerificationModal` - *already done*).
    - [ ] Assigned Task: Re-assign (`POST /api/assigned-tasks` via `TaskVerificationModal` - *already done*).
    - [ ] Assigned Task: Assign Task (`POST /api/assigned-tasks` via `AssignTaskModal` - *already done*).
    - [ ] Tickets: Manual Adjustment (`POST /api/ticket-adjustments` via `ManualTicketAdjustmentModal`).
    - [ ] Rewards: Redeem Reward (`POST /api/reward-redemptions` - requires UI/modal and mutation).
    - [ ] User Linking (Admin): Add UI controls (e.g., multi-select) in Create/Edit User Modals for linking Students <-> Teachers, Students <-> Instruments. Connect to `PATCH /api/users/:id`.

### [ ] 3. Implement Remaining Mock UI/Placeholders
    - [ ] Teacher Action: View All Students button functionality.
    - [ ] Parent Action: Link Another Student button functionality (QR flow).
    - [ ] Student Action: Rewards redemption flow/button.

### [ ] 4. Refinements & Testing
    - [ ] Thoroughly test all user role workflows after fixes.
    - [ ] Refine UI/UX based on testing (loading states, error messages, navigation).
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