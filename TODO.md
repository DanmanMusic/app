# TODO: Project Development & Release

## Gemini Rules/Notes

- When requested to print out file content, provide the full content of the file while be mindful to inflate sections of code commented out during iterations.
- Absolute hard rule of no comments in any code. If code has comments please remove!
- Assume developers are experts but are open to suggestions for better libraries, approaches, or solutions to technical challenges.
- This project is in an early development phase. Backward compatibility is not a requirement (e.g., database schema changes are acceptable).

Remember to replace placeholders like `[ ]` with `[x]` as tasks are completed.

## [x] Development

These are the major areas and tasks involved in building the application based on the functional specification in `SPECIFICATION.md`.

### [x] 1. Frontend First: Mock UI & View Prototyping

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
    - [x] Implement User Deactivate/Delete Flow: Replaced simple delete with modal offering "Deactivate"/"Reactivate" (primary) and "Permanent Delete" (secondary). Added `status` field to User. Updated `DataContext` (toggle simulation, delete simulation). Updated `AdminStudentDetailView` buttons and modal trigger. Disabled actions for inactive users in detail view. Filtered inactive users from Teacher view list and Assign Task modal.
    - [x] Implement Pagination Architecture:
        - [x] Created `hooks` directory.
        - [x] Created `usePaginatedStudents`, `usePaginatedTeachers`, `usePaginatedParents` hooks (using mock data).
        - [x] Created `usePaginatedAssignedTasks`, `usePaginatedTicketHistory` (global lists).
        - [x] Created `usePaginatedStudentTasks`, `usePaginatedStudentHistory` (single student lists).
        - [x] Created `PaginationControls` component.
        - [x] Refactored `AdminView` and `AdminUsersSection` for tabbed, paginated user lists with filtering.
        - [x] Refactored `ViewAllAssignedTasksModal` to use pagination hook.
        - [x] Refactored `AdminHistorySection` to use pagination hook.
        - [x] Refactored `AdminStudentDetailView`, `TeacherView` (profile), `StudentView` to use student-specific pagination hooks for task/history lists.
    - [x] Implement Search for Student Selection: Added search input to Step 1 of `AssignTaskModal`.
    - [ ] Implement Student Search (Admin): Add search input to Admin Users 'Students' tab. Update `usePaginatedStudents` hook (and eventually API) to filter by search term.
    - [ ] Implement Mock UI for other User Interactions:
        - [x] Admin CRUD: Task Library (Modal done).
        - [x] Admin CRUD: Rewards (Modal done).
        - [x] Admin CRUD: Announcements (Modal done).
        - [x] Admin CRUD: Instruments (Modal done).
        - [ ] Admin Action: Manual Ticket Adjustments (needs modal/input).
        - [ ] Admin Action: Redeeming Rewards (needs modal/selection).
        - [ ] Teacher Action: View All Students (mock) (needs list/modal).
        - [ ] Parent Action: Link Another Student (needs mock QR flow).

### [ ] 2. Backend Development and Integration

- [ ] Choose and set up backend technology (e.g., Node.js, Express, Prisma/TypeORM, PostgreSQL/MongoDB).
- [ ] Design and implement the database schema based on Data Models (Sec 6 in SPECIFICATION.md). Include `status` on Users table. Ensure `AssignedTask` stores snapshot data.
- [ ] Develop backend APIs for all functional areas:
    - [ ] User Auth (Teacher/Admin Login, QR Code generation/validation/consumption for Student/Parent).
    - [ ] User CRUD & Linking (incl. Deactivate/Reactivate endpoints setting `status`, separate Permanent Delete endpoint).
    - [ ] Implement Cascading Logic on Backend (Sec 8 in SPECIFICATION.md) for deactivation/deletion (unlinking, parent deletion if orphaned on *deactivate*).
    - [ ] Task Library CRUD.
    - [ ] Task Assignment (accepting snapshot details).
    - [ ] Task Completion & Verification flow.
    - [ ] Rewards Catalog CRUD.
    - [ ] Ticket Management (Awards, Redemptions, Manual Adjustments, History).
    - [ ] Announcements CRUD.
    - [ ] Instrument CRUD & Student Assignment.
    - [ ] **API Pagination/Filtering/Search:** Implement server-side pagination, filtering (by status etc.), and searching (by name etc.) for relevant endpoints (Users, Assigned Tasks, History).
- [ ] Integrate Frontend with Backend:
    - [ ] Replace mock data context (`useData`) simulation functions with actual API calls.
    - [ ] Update custom pagination hooks (`usePaginated*`) to fetch data from API endpoints, handle loading/error states.
    - [ ] Implement real authentication flow using backend endpoints.
    - [ ] Use a server state management library (e.g., React Query/TanStack Query) to handle caching, refetching, mutations.

### [ ] 3. Implementing Core Feature Logic

- [ ] Connect UI actions to backend API calls via mutations (using server state library).
- [ ] Implement real-time updates (optional V1 enhancement - e.g., WebSockets).
- [ ] Implement push notifications (optional V1 enhancement).

### [ ] 4. Supporting Features & Refinements

- [ ] Implement secure QR code generation and scanning logic (using appropriate libraries).
- [ ] Implement QR code revocation/expiry on backend.
- [ ] Implement robust frontend error handling (displaying API errors) and loading states.
- [ ] Refine UI/UX based on testing with real data flows.
- [ ] Add unit and integration tests.

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