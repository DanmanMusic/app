# TODO: Project Development & Release

## Gemini Rules/Notes

- When requested to print out file content, provide the full content of the file while be mindful to inflate sections of code commented out during iterations.
- Absolute hard rule of no comments in any code. If code has comments please remove!
- Assume developers are experts but are open to suggestions for better libraries, approaches, or solutions to technical challenges.
- This project is in an early development phase. Backward compatibility is not a requirement (e.g., database schema changes are acceptable).

Remember to replace placeholders like `[ ]` with `[x]` as tasks are completed.

## [x] Development

These are the major areas and tasks involved in building the application based on the functional specification in `SPECIFICATION.md`.

### [x] 1. Frontend First: Mock UI & View Prototyping (with Initial TQ/MSW Integration)

- [x] Refine User Data Model: Split `name` into `firstName`, `lastName`, `nickname`. Define structure. Update mocks, helpers, components. Added `linkedTeacherIds`, `linkedStudentIds`, `instrumentIds`, `status`.
- [x] Complete `student` -> `student` refactor across codebase.
- [x] Set up Mock Data: Created initial mock data. Added more students for pagination testing.
- [x] Implement Development View Selector.
- [x] Build Core Views (Using Mock Data):
    - [x] Public / Non-Logged-in View (incl. Tabs).
    - [x] Student View (incl. Tabs, Goal Modal).
    - [x] Teacher View (incl. Student list/profile access).
    - [x] Parent View (incl. Student selection/view).
    - [x] Admin View (basic structure).
- [x] Refine UI/UX:
    - [x] Implement multi-step task verification modal.
    - [x] Use actual Image components. Added Instrument icons.
    - [x] Break down AdminView into section components.
    - [x] Refine mock button labels.
    - [x] Consolidate styles (`colors.ts`, `appSharedStyles.ts`).
    - [x] Refactor views/components to use shared styles/colors.
    - [x] Implement Context API (`AuthContext`, `DataContext`). Refactored views to use context.
    - [x] Implement Mock UI for "Create User" via modal.
    - [x] Implement Mock UI flow for Editing Users via modal.
    - [x] Refactor Task Assignment: Decoupled `AssignedTask` from `TaskLibrary`, allowing Ad-Hoc tasks via `AssignTaskModal`. Updated related context, views, components.
    - [x] Implement User Deactivate/Delete Flow: Replaced simple delete with modal offering "Deactivate"/"Reactivate" (primary) and "Permanent Delete" (secondary via `ConfirmationModal`). Added `status` field to User. Updated relevant components.
    - [x] Implement Pagination Architecture:
        - [x] Created `hooks` directory.
        - [x] Created initial pagination hooks using `DataContext`.
        - [x] Created `PaginationControls` component.
        - [x] Refactored initial views/components to use hooks.
    - [x] Implement TQ/MSW for Admin User Lists:
        - [x] Installed TQ & MSW.
        - [x] Configured MSW handlers (`GET /api/students`, `GET /api/teachers`, `GET /api/parents`).
        - [x] Configured TQ Provider & `metro.config.js`.
        - [x] Created API client functions (`fetchStudents`, `fetchTeachers`, `fetchParents`).
        - [x] Refactored `usePaginatedStudents`, `usePaginatedTeachers`, `usePaginatedParents` hooks to use TQ/MSW.
        - [x] Updated `AdminView` & `AdminUsersSection` to use refactored hooks & display loading/error states.
    - [x] Implement TQ/MSW User Mutations:
        - [x] Added MSW handlers (`POST /api/users`, `PATCH /api/users/:id`, `DELETE /api/users/:id`, `PATCH /api/users/:id/status`).
        - [x] Created API client functions (`createUser`, `updateUser`, `deleteUser`, `toggleUserStatus`).
        - [x] Refactored `CreateUserModal`, `EditUserModal`, `DeactivateOrDeleteUserModal` to use `useMutation`.
        - [x] Removed corresponding simulation functions from `DataContext`.
    - [x] Implement Search for Student Selection: Added search input to Step 1 of `AssignTaskModal`.
    - [x] Implement Student Search (Admin): Added search input & state plumbing to Admin Users 'Students' tab via `usePaginatedStudents`.
    - [x] Refactor Other Lists with TQ/MSW:
        - [x] Task Library (`AdminTasksSection`, Modals).
        - [x] Rewards (`AdminRewardsSection`, Modals).
        - [x] Announcements (`AdminAnnouncementsSection`, Modals).
        - [x] Instruments (`AdminInstrumentsSection`, Modals).
        - [x] Assigned Tasks List (`ViewAllAssignedTasksModal`, `usePaginatedAssignedTasks` hook).
        - [x] Global Ticket History (`AdminHistorySection`, `usePaginatedTicketHistory` hook).
        - [x] Student Balance Fetch (`StudentView`, `AdminStudentDetailView`).
        - [ ] Student-Specific History (`usePaginatedStudentHistory` hook update).
        - [ ] Student-Specific Tasks (`usePaginatedStudentTasks` hook update).
        - [ ] Refactor `AdminStudentDetailView`, `TeacherView` (profile), `StudentView` task/history lists fully.
    - [x] Implement Other Mutations with TQ/MSW:
        - [x] Task Library CRUD.
        - [x] Rewards CRUD.
        - [x] Announcements CRUD.
        - [x] Instruments CRUD.
        - [x] Assigned Task mutations (Mark Complete, Delete Assignment).
        - [ ] Assigned Task mutations (Assign Task, Verify Task).
        - [ ] Ticket/Reward mutations (Manual Adjust, Redeem).
    - [x] Replace `Alert.alert` with `ConfirmationModal` where appropriate.
    - [x] Remove `Alert.alert` calls from `DataContext`.
    - [ ] Implement UI Feedback for Mutations (e.g., Toasts, inline messages instead of removed Alerts).
    - [ ] Implement Remaining Mock UI for User Interactions:
        - [ ] Admin Action: Manual Ticket Adjustments (modal exists, needs to replace `alert`).
        - [ ] Admin Action: Redeeming Rewards (needs modal/selection, connect to TQ mutation).
        - [ ] Teacher Action: View All Students (mock) (needs list/modal, connect to TQ query).
        - [ ] Parent Action: Link Another Student (needs mock QR flow/confirmation).
        - [ ] User Linking (Admin): Add UI controls (e.g., multi-select) in Create/Edit User Modals for linking Students <-> Teachers, Students <-> Instruments. Connect to PATCH `/api/users/:id`.

### [ ] 2. Backend Development and Integration (Target: Supabase)

- [ ] Set up Supabase project.
- [ ] Define database schema in Supabase based on Data Models (Sec 6 in SPECIFICATION.md). Pay attention to relationships and foreign keys.
- [ ] Develop Supabase Edge Functions for complex business logic (Task Verification, Reward Redemption, Manual Adjustments, Cascading Deletes/Deactivations from Sec 8).
- [ ] Integrate Frontend with Supabase:
    - [ ] Install and configure `supabase-js` client.
    - [ ] Replace API client functions (`fetch*`, `create*`, etc.) with `supabase-js` calls (`supabase.from(...)`, `supabase.functions.invoke(...)`) within the TQ `queryFn`/`mutationFn`.
    - [ ] Implement real authentication flow (QR Code, Teacher/Admin login) using Supabase Auth. Update `AuthContext`.
    - [ ] Update pagination hooks to pass Supabase query parameters (`range`, filters).
    - [ ] Ensure TQ `queryKeys` and `invalidateQueries` calls align with Supabase data structure and operations.
    - [ ] Remove MSW dependency and configuration (`metro.config.js`, `browser.ts`, `server.ts`, `handlers.ts`, mock data files).
- [ ] Potentially remove `DataContext` entirely if all state is managed by TQ or component state.

### [ ] 3. Implementing Core Feature Logic

- [ ] Connect remaining UI actions to Supabase backend via TQ mutations (e.g., Reward Redemption flow, Manual Adjustments).
- [ ] Implement real-time updates (optional - using Supabase Realtime, e.g., for ticket balance).
- [ ] Implement push notifications (optional - using external service + Supabase Edge Functions, e.g., for new task assignment).

### [ ] 4. Supporting Features & Refinements

- [ ] Implement secure QR code generation and scanning logic (using appropriate libraries like `react-native-qrcode-svg` and `expo-camera` or `expo-barcode-scanner`).
- [ ] Implement QR code revocation/expiry on backend (possibly via Edge Functions or database logic).
- [ ] Refine frontend error handling (displaying API errors gracefully using TQ `error` state).
- [ ] Refine UI/UX based on testing with real data flows (consider loading states, placeholders).
- [ ] Add unit and integration tests (using tools like Jest, React Native Testing Library).

## [ ] Android Release Steps

(Steps remain the same)

## [ ] iOS Release Steps

(Steps remain the same)