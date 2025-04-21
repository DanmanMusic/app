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

- [x] Refine User Data Model: Split `name` into `firstName`, `lastName`, `nickname` (optional). Define structure in `src/types/userTypes.ts`. Update mocks, helpers (`getUserDisplayName`), and all views/components using user names. Update Create/Edit User modals. Add `linkedTeacherIds` to Student.
- [x] Complete `student` -> `student` refactor across codebase (views, types, mocks, props, logic).
- [x] Set up Mock Data: Create representative JavaScript objects/arrays to simulate the data structure for various users (including student instruments), sample tasks, ticket data, rewards, announcements, and the instrument list.
- [x] Implement Development View Selector: Create a simple, temporary mechanism visible only in development builds that allows switching between simulating different user roles and navigating to key screens.
- [x] Build Core Views (Using Mock Data): Develop the React Native screens and components for each user role's main functional areas:
    - [x] Public / Non-Logged-in View: Implement the public Rewards Catalog and Announcements display. Added basic tab navigation ('Welcome', 'Announcements', 'Rewards Catalog').
    - [x] Student View: Dashboard/Home (display assigned instrument(s), balance, goal), Assigned Task List, Rewards Catalog, Ticket Transaction History, Announcements. Added tab navigation ('Dashboard', 'Tasks', 'Rewards', 'Announcements'). Implemented Goal setting/changing via modal.
    - [x] Teacher View: Student List (display student instrument(s)), Task Assignment, Pending Verification List, Task Verification screen, Access to view student details (Task List, History, Balance, Catalog, Instruments).
    - [x] Parent View: Family Dashboard/Student selector (display child instrument(s)), Navigation to Student view, "Add Another Student" UI.
    - [x] Admin View: Placeholder/simplified UI for key management workflows, including Instrument List management.
- [x] Refine UI/UX: Iterate on the visual design, layout, and user flow based on internal review or feedback.
    - [x] Implement multi-step task verification modal with status selection, point adjustment via slider, and re-assign option (Note: Added `@react-native-community/slider` dependency).
    - [x] Replace placeholder images with actual Image components for Rewards Catalog items in Student, Public, and Admin views. Added Instrument icons.
    - [x] Break down large AdminView.tsx file into smaller section components for better organization and readability, including extracting the student detail view and creating shared styles for Admin components.
    - [x] Refine mock button labels in Admin views to clarify implemented vs. placeholder actions. (Ongoing as mock flows are implemented)
    - [x] Consolidate color palette and common styles into `src/styles/colors.ts` and `src/styles/appSharedStyles.ts`.
    - [x] Refactor views (`App.tsx`, `StudentView.tsx`, `TeacherView.tsx`, `ParentView.tsx`, `PublicView.tsx`) and key components (`TaskVerificationModal.tsx`, `src/components/admin/*`) to use shared styles and colors.
    - [x] Implement Context API (`AuthContext`, `DataContext`) to manage state and simulation functions, significantly simplifying `App.tsx` and view props. Refactored all views (`Public`, `Student`, `Teacher`, `Parent`, `Admin`) to use context hooks.
    - [x] Implement Mock UI for "Create User" via a modal in the Admin Users section (Excluding Parent role, moved Teacher linking to Student).
    - [x] Implement mock UI flow for Editing/Deleting Users: Refined Edit User Modal (conditional nickname, student fields, removed delete), moved state/rendering to `AdminStudentDetailView` to fix launch timing. Delete confirmed via detail view.
    - [ ] Implement Mock UI for other User Interactions: Replace placeholder alerts for Admin CRUD operations on other entities (Task Library items, Rewards, Instruments) and other flows (e.g., Teacher/Parent "Add Another Student" flows) with actual mock UI flows.
        - [ ] **Admin View:**
            - [x] Implement mock UI flow for Creating/Editing/Deleting Task Library Items. (Modals created, state simulation working via Context)
            - [x] Implement mock UI flow for Creating/Editing/Deleting Rewards Catalog Items. (Modals created, state simulation working via Context)
            - [x] Implement mock UI flow for Creating/Editing/Deleting Announcements (Modals created, state simulation working via Context).
            - [x] Implement mock UI flow for Creating/Editing/Deleting Instruments (Modals created, state simulation working via Context).
            - [ ] Implement mock UI flow for Manual Ticket Adjustments (including input for amount and notes).
            - [ ] Implement mock UI flow for Redeeming Rewards (selecting reward and student).
            - [x] Implement mock UI flow for Assigning Tasks (selecting tasks and students). (Modal created, state simulation working via Context)
            - [x] Implement mock screen/list for "View All Assigned Tasks". (Modal created with filtering, state simulation working via Context)
            - [ ] Implement mock screen/list for "View Full History" (from student detail).
        - [ ] **Teacher View:**
            - [ ] Implement "Login (QR)" button in student profile view.
            - [ ] Implement mock UI flow for Assigning Tasks (selecting tasks and students).
            - [ ] Implement mock screen/list for "View All Students".
            - [x] Implement mock UI flow for Deleting Assigned Tasks (from student profile view - uses context action). *(Label can be updated)*
        - [ ] **Parent View:**
            - [ ] Implement mock UI flow for "Add Another Student" (simulating QR scan input).
            - [ ] Implement mock screen/list for "View Full History" (from student profile view).
        - [ ] **Student View:**
            - [x] Implement mock UI flow for "Set/Change Goal" (Modal implemented).
            - [ ] Implement mock screen/list for "View Full History".
            - [x] Implement mock screen/list for "View All Announcements" (Now handled via Announcements Tab).

### [ ] 2. Backend Development and Integration

- [ ] Choose and set up backend technology.
- [ ] Design and implement the database schema, including a table/collection for Instruments and the relationship between Students and Instruments (1-to-many), and Students and Teachers (many-to-many via `linkedTeacherIds` on Student).
- [ ] Develop backend APIs for all functional areas (User Auth, CRUD, Linking; Task management; Ticket management; Rewards Catalog; Announcements; Instrument Management - CRUD).
    - [ ] **Data Integrity:** Ensure deleting a **Teacher** removes references from the `linkedTeacherIds` array on all associated **Student** records.
- [ ] Update APIs to handle Student instrument assignments and allow filtering tasks/students by instrument.
- [ ] Integrate Frontend with Backend: Replace mock data in UI components with actual API calls.
- [ ] Implement authentication flow connecting UI to backend auth endpoints.

### [ ] 3. Implementing Core Feature Logic

- [ ] Connect UI actions (Mark Complete, Verify, Assign, Adjust, Redeem) to backend API calls.
- [ ] Implement real-time updates for relevant data.
- [ ] Implement push notification registration and handling logic.

### [ ] 4. Supporting Features & Refinements

- [ ] Implement secure QR code generation (Admin/Teacher) and scanning/verification (Mobile) logic.
- [ ] Implement QR code revocation/recovery mechanism.
- [ ] Implement robust error handling and loading states.
- [ ] Refine UI/UX based on testing.
- [ ] Implement any required offline capabilities.
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