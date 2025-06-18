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

### Phase 5: Foundational Architecture & V2 Schema (Complete)

- [x] **Multi-Tenancy Implementation (Step Zero):**
  - [x] **Schema:** Create `companies` table. Add `company_id` to all relevant tables.
  - [x] **RLS:** Refactor all RLS policies to enforce `company_id` isolation, including for Storage.
  - [x] **Edge Functions:** Update all Edge Functions to be company-aware and secure.
- [x] **V2 Feature Schema Additions:**
  - [x] **Schema:** Create `practice_logs` table for streak feature.
  - [x] **Schema:** Add `timezone` to `companies` table for scheduled tasks.
  - [x] **Schema:** Create `push_tokens` and `notification_log` tables for notifications.
  - [x] **Schema:** Add `avatar_path` to `profiles` and create `avatars` storage bucket.
  - [x] **Schema:** Add `is_goal_eligible` to `rewards` table.
  - [x] **Schema:** Add `can_self_assign` & `journey_location_id` to `task_library` table.
  - [x] **Schema:** Create `journey_locations` table.
- [x] **Client-Side API & Type Safety:**
  - [x] **Types:** Implement `supabase gen types` workflow for full type safety.
  - [x] **API Layer:** Refactor all `src/api/*.ts` files to align with V2 schema and Edge Functions.

### Phase 6: Core Engagement Features (In Progress)

- [x] **Feature: Avatars (Admin & Self-Editing):**
  - [x] **UI:** Implement image picker and upload logic in `EditMyInfoModal.tsx` and `EditUserModal.tsx`.
  - [x] **UI:** Display avatars in list and detail views.
- [x] **Feature: Journey Locations & Self-Assignable Tasks (Admin Side):**
  - [x] **UI:** Add "Journey" section to `AdminView`.
  - [x] **UI:** Create `AdminJourneySection.tsx` for CRUD management.
  - [x] **UI:** Integrate Journey Location picker into Task Library modals.
- [x] **Feature: Student-Facing UI - Practice Streaks:**
  - [x] **Backend:** Create `get_student_streak_details` and `get_company_streak_stats` RPCs.
  - [x] **Backend:** Create `log-practice-and-check-streak` Edge Function with milestone trigger.
  - [x] **UI:** Create `PracticeStreakTracker.tsx` component and `LogPracticeModal.tsx`.
  - [x] **UI:** Integrate tracker into `StudentView`.
- [x] **Feature: Student-Facing UI - Goal Setting:**
  - [x] **UI:** Refactor goal display into `GoalTracker.tsx` component.
  - [x] **UI:** Update `SetGoalModal.tsx` to filter rewards by `isGoalEligible`.
- [x] **Feature: Student-Facing UI - Community & Social Proof:**
  - [x] **Backend:** Create `get_company_goal_stats` RPC to count students aiming for each reward.
  - [x] **UI:** Update `SetGoalModal` to display "X others are saving for this!" text.
  - [x] **UI:** Create `CommunityGoalsWidget.tsx` to show trending goals on the student dashboard.
  - [x] **UI:** Create `CommunityStreaksWidget.tsx` to show active streak stats on the student dashboard.
  - [ ] **UI:** Update `AnnouncementListItem.tsx` to properly display `streak_milestone` and `redemption_celebration` types with student avatar and name.
- [x] **Feature: Self-Assignable Tasks (Student Side):**
  - [x] **UI:** Add "Available Tasks" or "Journey" section to `StudentView`.
  - [x] **UI:** Display a list of self-assignable tasks, categorized by Journey Location.
  - [x] **UI:** Implement "Assign to Me" functionality.
- [x] **Feature: Enhanced Teacher/Admin Views:**
  - [x] **Backend:** Create performant RPC (`get_student_list_with_stats`) to fetch student list with balance, goal, and streak info included. Consider using a Materialized View for performance.
  - [x] **UI:** Update `AdminStudentItem.tsx` and `TeacherStudentsSection.tsx` to display the new stats.
- [ ] **Feature: Notifications Infrastructure:**
  - [x] **Client:** Implement `usePushNotifications` hook (or similar) to handle token registration on native platforms.
  - [x] **Backend:** Create the core `send-notification` Edge Function.
  - [ ] **Pilot Feature (Daily Summary):**
    - [ ] Create RPC functions to get daily summary data.
    - [ ] Set up `pg_cron` jobs to call the functions and trigger notifications via the Edge Function.

### Phase 7: Final Polish & Testing

- [ ] **V2 Refinements & Thorough Testing:**
  - [ ] **Testing:** End-to-end test the multi-tenancy implementation.
  - [ ] **Testing:** Test all notification flows on a physical device.
  - [ ] **UI/UX Review:** Conduct a full review of all new V2 features.

### V3+ Ideas (Backlog)

- [ ] **Streak Freeze:** Allow students to "pause" their streak for vacations.
- [ ] **Teacher Nudges:** One-click, pre-written reminders from teachers to students.
- [ ] **Visual Music Journey:** Interactive poster map with unlockable locations.
- [ ] **Parent-initiated Reminders:** Let parents send custom reminders to their children.
