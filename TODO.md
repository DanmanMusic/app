# TODO: Project Development & Release

## Gemini Rules/Notes

- When requested to print out file content, provide the full content of the file while be mindful to inflate sections of code commented out during iterations.
- Absolute hard rule of no comments in any code. If code has comments please remove!
- Assume developers are experts but are open to suggestions for better libraries, approaches, or solutions to technical challenges.
- This project is in an early development phase. Backward compatibility is not a requirement (e.g., database schema changes are acceptable).

Remember to replace placeholders like `[ ]` with `[x]` as tasks are completed.

## [ ] Development

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
    - [ ] Refactor Other Lists with TQ/MSW:
        - [ ] `ViewAllAssignedTasksModal` (`usePaginatedAssignedTasks` hook).
        - [ ] `AdminHistorySection` (`usePaginatedTicketHistory` hook).
        - [ ] `AdminStudentDetailView`, `TeacherView` (profile), `StudentView` (task/history lists using `usePaginatedStudentTasks`/`usePaginatedStudentHistory`).
    - [ ] Implement Other Mutations with TQ/MSW:
        - [ ] Task Library CRUD.
        - [ ] Rewards CRUD.
        - [ ] Announcements CRUD.
        - [ ] Instruments CRUD.
        - [ ] Assigned Task mutations (Mark Complete, Verify, Delete Assignment).
        - [ ] Ticket/Reward mutations (Manual Adjust, Redeem).
    - [ ] Implement Remaining Mock UI for User Interactions:
        - [ ] Admin Action: Manual Ticket Adjustments (needs modal/input, connect to TQ mutation).
        - [ ] Admin Action: Redeeming Rewards (needs modal/selection, connect to TQ mutation).
        - [ ] Teacher Action: View All Students (mock) (needs list/modal, connect to TQ query).
        - [ ] Parent Action: Link Another Student (needs mock QR flow/confirmation).

### [ ] 2. Backend Development and Integration (Target: Supabase)

- [ ] Set up Supabase project.
- [ ] Define database schema in Supabase based on Data Models (Sec 6 in SPECIFICATION.md).
- [ ] Develop Supabase Edge Functions for complex business logic (Task Verification, Reward Redemption, Manual Adjustments, Cascading Deletes/Deactivations from Sec 8).
- [ ] Integrate Frontend with Supabase:
    - [ ] Install and configure `supabase-js` client.
    - [ ] Replace `msw` handlers/API client functions with `supabase-js` calls (`supabase.from(...)`, `supabase.functions.invoke(...)`) within the TQ `queryFn`/`mutationFn`.
    - [ ] Implement real authentication flow (QR Code, Teacher/Admin login) using Supabase Auth.
    - [ ] Update pagination hooks to pass Supabase query parameters (range, filters).
    - [ ] Ensure TQ `queryKeys` and `invalidateQueries` calls align with Supabase data structure.
- [ ] Potentially remove `DataContext` entirely if all state is managed by TQ or component state.

### [ ] 3. Implementing Core Feature Logic

- [ ] Connect remaining UI actions to Supabase backend via TQ mutations.
- [ ] Implement real-time updates (optional - using Supabase Realtime).
- [ ] Implement push notifications (optional - using external service + Supabase Edge Functions).

### [ ] 4. Supporting Features & Refinements

- [ ] Implement secure QR code generation and scanning logic (using appropriate libraries).
- [ ] Implement QR code revocation/expiry on backend (possibly via Edge Functions or database logic).
- [ ] Refine frontend error handling (displaying API errors gracefully).
- [ ] Refine UI/UX based on testing with real data flows.
- [ ] Add unit and integration tests (using tools like Jest, React Native Testing Library, potentially mocking with `msw`).

## [ ] Android Release Steps

Use these steps to build, sign, and upload a release version of the app to the Google Play Store using Expo Application Services (EAS). This assumes your codebase is ready for release.

1.  [ ] **Verify EAS CLI Setup:** Ensure `eas-cli` is installed globally and you are logged in (`eas login`). If not installed, run `npm install -g eas-cli` or `yarn global add eas-cli`. Ensure `eas build:configure` has been run at least once for the project to set up build profiles and signing.
2.  [ ] **Update App Version:** Increment the `expo.version` (visible version) and the `expo.android.versionCode` (internal build identifier - must be a unique integer > previous) in `app.json`.
3.  [ ] **Initiate EAS Build:** Run the build command for Android targeting the production profile. This bundles assets, builds native code, and handles signing on Expo's servers.
    ```bash
    eas build -p android --profile production
    ```
4.  [ ] **Download Artifact:** Once the EAS build completes, download the generated `.aab` (Android App Bundle) file from the link provided in the terminal or on the EAS dashboard.
5.  [ ] **Upload to Google Play Console:** Log in to your Google Play Console, navigate to your app, and create a new release in the desired track (e.g., Internal, Alpha, Beta, Production). Upload the downloaded `.aab` file.
6.  [ ] **Configure & Rollout:** Add release notes, configure country/region availability, and set the rollout percentage. Then, start the rollout of the release.

## [ ] iOS Release Steps

Use these steps to build, sign, and upload a release version of the app to the Apple App Store (via App Store Connect) using Expo Application Services (EAS). This assumes your codebase is ready for release.

1.  [ ] **Verify EAS CLI Setup:** Ensure `eas-cli` is installed globally and you are logged in (`eas login`). If not installed, run `npm install -g eas-cli` or `yarn global add eas-cli`. Ensure `eas build:configure` has been run at least once, properly configuring iOS certificates and provisioning profiles via EAS.
2.  [ ] **Update App Version:** Increment the `expo.version` (visible version) and the `expo.ios.buildNumber` (internal build identifier - must be a unique string > previous) in `app.json`.
3.  [ ] **Initiate EAS Build:** Run the build command for iOS targeting the production profile. This bundles assets, builds native code, and handles signing and provisioning on Expo's servers.
    ```bash
    eas build -p ios --profile production
    ```
4.  [ ] **Download Artifact:** Once the EAS build completes, download the generated `.ipa` (iOS App Archive) file from the link provided in the terminal or on the EAS dashboard.
5.  [ ] **Upload to App Store Connect:** Upload the `.ipa` file to App Store Connect. You can use the Transporter app (Mac only) or the `eas submit` command:
    ```bash
    eas submit -p ios --latest
    ```
6.  [ ] **Prepare for Submission:** Log in to App Store Connect, find the uploaded build under your app. Add necessary metadata, screenshots, app privacy details, and review information.
7.  [ ] **Submit for Review:** Submit the build to Apple for their review process.
8.  [ ] **Release:** Once approved by Apple, release the app version to the App Store.