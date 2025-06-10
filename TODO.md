# TODO: Project Development & Release

## Gemini Rules/Notes

- When requested to print out file content, provide the full content of the file while be mindful to inflate sections of code commented out during iterations.
- Absolute hard rule of no comments in any code. If code has comments please remove!
- Assume developers are experts but are open to suggestions for better libraries, approaches, or solutions to technical challenges.
- This project is in an early development phase. Backward compatibility is not a requirement (e.g., database schema changes are acceptable).

Remember to replace placeholders like `[ ]` with `[x]` as tasks are completed.

## V1 & Backend Refactor (Phases 1-4)

- [x] All items from original Phase 1-4 are considered complete.
- [x] The project has been successfully migrated to a multi-tenant architecture.
- [x] All initial RLS and Edge Function bugs post-migration have been resolved.
- [x] The application is in a stable, logged-in state.

---

## V2 Development Plan

This plan outlines the major features and architectural changes for Version 2.

### Phase 5: Foundational Architecture (Multi-Tenancy & V2 Schema)

- **[x] Multi-Tenancy Implementation (Step Zero):**
  - [x] **Schema:** Create `companies` table.
  - [x] **Schema:** Add `company_id` FK to all company-scoped tables.
  - [x] **RLS:** Refactor all RLS policies to enforce `company_id` isolation.
  - [x] **Edge Functions:** Update all Edge Functions to be company-aware and secure against cross-tenant actions.
- **[x] V2 Feature Schema Additions:**
  - [x] **Schema:** Create `practice_logs` table for streak feature.
  - [x] **Schema:** Create `push_tokens` table for notifications infrastructure.
  - [x] **Schema:** Add `avatar_path` column to `profiles` table and create `avatars` storage bucket.
  - [x] **Schema:** Add `is_goal_eligible` boolean to `rewards` table.
  - [x] **Schema:** Add `can_self_assign` boolean to `task_library` table.
  - [x] **Schema:** Create `journey_locations` table and add `journey_location_id` FK to `task_library`.
- **[x] Client-Side API Alignment:**
    - [x] **Types:** Update all TypeScript types in `dataTypes.ts` to match the V2 schema.
    - [x] **API Layer:** Refactor all functions in `src/api/*.ts` to align with V2 schema and Edge Function payloads.
    - [x] **API Layer:** Create new `src/api/journey.ts` for managing journey locations.

### Phase 6: Core Engagement Features (Frontend Implementation)

- **[x] Feature: Avatars (Admin & Self-Editing):**
  - [x] **UI:** Implement image picker and upload logic in `EditMyInfoModal.tsx`.
  - [x] **UI:** Implement image picker and upload logic in `EditUserModal.tsx`.
  - [x] **UI:** Display avatars in list views (`AdminUserItem.tsx`, `AdminStudentItem.tsx`).
  - [x] **UI:** Display avatars in detail views (`AdminAdminDetailView.tsx`, `AdminTeacherDetailView.tsx`, `AdminParentDetailView.tsx`, `StudentDetailView.tsx`).
- **[x] Feature: Journey Locations & Self-Assignable Tasks (Admin Side):**
  - [x] **UI:** Add "Journey" section to `AdminView`.
  - [x] **UI:** Create `AdminJourneySection.tsx` component for CRUD management.
  - [x] **UI:** Create `CreateJourneyLocationModal.tsx` and `EditJourneyLocationModal.tsx`.
  - [x] **UI:** Integrate Journey Location picker into `CreateTaskLibraryModal.tsx` and `EditTaskLibraryModal.tsx` when "self-assign" is enabled.

- **[ ] Feature: Student-Facing UI & New Features:**
  - [ ] **Practice Streaks:**
    - [ ] Create `log-practice-and-check-streak` Edge Function.
    - [ ] Create `get_student_streak` RPC function.
    - [ ] Create `src/api/streaks.ts` API file.
    - [ ] Create `PracticeStreakTracker.tsx` component.
    - [ ] Add the `PracticeStreakTracker` component to the `StudentView` dashboard.
  - [ ] **Self-Assignable Tasks (Student Side):**
    - [ ] Add a new "Available Tasks" or "Journey" section to `StudentView`.
    - [ ] Display a list of self-assignable tasks, categorized by Journey Location.
    - [ ] Implement the "Assign to Me" button functionality, calling the `assignTask` Edge Function (may require minor EF update to allow student as caller).
  - [ ] **Student Goals:**
    - [ ] Update `SetGoalModal.tsx` to filter the rewards list using the `isGoalEligible` flag.
  - [ ] **Enriched Announcements:**
    - [ ] Update `AnnouncementListItem.tsx` to display the related student's avatar and name if they exist.

- **[ ] Feature: Notifications Infrastructure:**
  - [ ] **Setup:** Install and configure `expo-notifications`.
  - [ ] **Client:** Implement a `usePushNotifications` hook to handle permissions and token registration.
  - [ ] **Backend:** Create the core `send-notification` Edge Function.
  - [ ] **Pilot Feature (Daily Summary):**
    - [ ] Create `get_daily_activity_summary()` RPC function.
    - [ ] Set up a `pg_cron` job to call the function and trigger notifications.

### Phase 7: Final Polish & Testing

- **[ ] V2 Refinements & Thorough Testing:**
  - [ ] **Testing:** End-to-end test the multi-tenancy implementation.
  - [ ] **Testing:** Test all notification flows on a physical device.
  - [ ] **UI/UX Review:** Conduct a full review of all new V2 features.