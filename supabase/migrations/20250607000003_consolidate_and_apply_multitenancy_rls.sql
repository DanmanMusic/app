-- Migration: Consolidate and apply all multi-tenancy RLS policies.
-- This single file creates the helper function and then uses it to
-- overhaul all RLS policies, ensuring a clean migration history.
-- This replaces the two previous files with the '20250607000002' timestamp.

----------------------------------------------------------------
-- Part 1: Create the RLS Helper Function in the 'public' schema
----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_current_user_company_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$;
COMMENT ON FUNCTION public.get_current_user_company_id() IS 'Returns the company_id of the currently authenticated user from their profile.';
GRANT EXECUTE ON FUNCTION public.get_current_user_company_id() TO authenticated;


----------------------------------------------------------------
-- Part 2: Overhaul RLS Policies for All Tables
----------------------------------------------------------------

-- === Table: profiles ===
DROP POLICY IF EXISTS "Profiles: Allow admin read access" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Allow individual read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Allow teachers read linked students" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Allow parents read linked children" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Allow users read Active Admin/Teacher info" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Allow student/parent update limited fields" ON public.profiles;

CREATE POLICY "Profiles: Admins can read all profiles in their company" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_active_admin(auth.uid()) AND company_id = public.get_current_user_company_id());

CREATE POLICY "Profiles: Users can read their own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id AND company_id = public.get_current_user_company_id());

CREATE POLICY "Profiles: Teachers can read linked students in their company" ON public.profiles
  FOR SELECT TO authenticated USING (company_id = public.get_current_user_company_id() AND public.is_active_admin_or_teacher(auth.uid()) AND role = 'student' AND EXISTS (SELECT 1 FROM public.student_teachers st WHERE st.teacher_id = auth.uid() AND st.student_id = public.profiles.id));

CREATE POLICY "Profiles: Parents can read linked children in their company" ON public.profiles
  FOR SELECT TO authenticated USING (company_id = public.get_current_user_company_id() AND role = 'student' AND EXISTS (SELECT 1 FROM public.parent_students ps WHERE ps.parent_id = auth.uid() AND ps.student_id = public.profiles.id) AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'active'));

CREATE POLICY "Profiles: Users can read Active Admins/Teachers in their company" ON public.profiles
  FOR SELECT TO authenticated USING (company_id = public.get_current_user_company_id() AND ((role = 'admin' AND status = 'active') OR (role = 'teacher' AND status = 'active')));

CREATE POLICY "Profiles: Students/Parents can update their profile in company" ON public.profiles
  FOR UPDATE TO authenticated USING (company_id = public.get_current_user_company_id() AND public.can_student_or_parent_update_profile_limited(id)) WITH CHECK (company_id = public.get_current_user_company_id() AND public.can_student_or_parent_update_profile_limited(id));


-- === Table: instruments ===
DROP POLICY IF EXISTS "Instruments: Allow public read access" ON public.instruments;
DROP POLICY IF EXISTS "Instruments: Allow admin insert access" ON public.instruments;
DROP POLICY IF EXISTS "Instruments: Allow admin update access" ON public.instruments;
DROP POLICY IF EXISTS "Instruments: Allow admin delete access" ON public.instruments;

CREATE POLICY "Instruments: Allow read access within company" ON public.instruments
  FOR SELECT USING (company_id = public.get_current_user_company_id());
CREATE POLICY "Instruments: Allow admin write access within company" ON public.instruments
  FOR ALL TO authenticated USING (company_id = public.get_current_user_company_id() AND public.is_active_admin(auth.uid())) WITH CHECK (company_id = public.get_current_user_company_id() AND public.is_active_admin(auth.uid()));


-- === Table: rewards ===
DROP POLICY IF EXISTS "Rewards: Allow public read access" ON public.rewards;
DROP POLICY IF EXISTS "Rewards: Allow admin insert access" ON public.rewards;
DROP POLICY IF EXISTS "Rewards: Allow admin update access" ON public.rewards;
DROP POLICY IF EXISTS "Rewards: Allow admin delete access" ON public.rewards;

CREATE POLICY "Rewards: Allow read access within company" ON public.rewards
  FOR SELECT USING (company_id = public.get_current_user_company_id());
CREATE POLICY "Rewards: Allow admin write access within company" ON public.rewards
  FOR ALL TO authenticated USING (company_id = public.get_current_user_company_id() AND public.is_active_admin(auth.uid())) WITH CHECK (company_id = public.get_current_user_company_id() AND public.is_active_admin(auth.uid()));


-- === Table: announcements ===
DROP POLICY IF EXISTS "Announcements: Allow public read access" ON public.announcements;
DROP POLICY IF EXISTS "Announcements: Allow admin/teaacher insert access" ON public.announcements;
DROP POLICY IF EXISTS "Announcements: Allow admin insert access" ON public.announcements;
DROP POLICY IF EXISTS "Announcements: Allow admin update access" ON public.announcements;
DROP POLICY IF EXISTS "Announcements: Allow admin delete access" ON public.announcements;

CREATE POLICY "Announcements: Allow read access within company" ON public.announcements
  FOR SELECT USING (company_id = public.get_current_user_company_id());
CREATE POLICY "Announcements: Allow admin/teacher write access within company" ON public.announcements
  FOR ALL TO authenticated USING (company_id = public.get_current_user_company_id() AND public.is_active_admin_or_teacher(auth.uid())) WITH CHECK (company_id = public.get_current_user_company_id() AND public.is_active_admin_or_teacher(auth.uid()));


-- === Table: assigned_tasks ===
DROP POLICY IF EXISTS "Assigned Tasks: Allow admin read access" ON public.assigned_tasks;
DROP POLICY IF EXISTS "Assigned Tasks: Allow students read own" ON public.assigned_tasks;
DROP POLICY IF EXISTS "Assigned Tasks: Allow parents read children" ON public.assigned_tasks;
DROP POLICY IF EXISTS "Assigned Tasks: Allow teachers read linked students" ON public.assigned_tasks;
DROP POLICY IF EXISTS "Assigned Tasks: Allow teachers insert for linked students" ON public.assigned_tasks;
DROP POLICY IF EXISTS "Student/Parent Update - Mark Complete Via Function" ON public.assigned_tasks;
DROP POLICY IF EXISTS "Assigned Tasks: Allow teachers update linked students verification" ON public.assigned_tasks;
DROP POLICY IF EXISTS "Assigned Tasks: Allow teachers delete own assignments (pre-verification)" ON public.assigned_tasks;
DROP POLICY IF EXISTS "Assigned Tasks: Allow admin full access" ON public.assigned_tasks;

CREATE POLICY "Assigned Tasks: Allow role-based access within company" ON public.assigned_tasks
  FOR ALL TO authenticated
  USING (
    company_id = public.get_current_user_company_id() AND
    (
      public.is_active_admin(auth.uid()) OR
      auth.uid() = student_id OR
      EXISTS (SELECT 1 FROM public.parent_students ps WHERE ps.parent_id = auth.uid() AND ps.student_id = assigned_tasks.student_id) OR
      EXISTS (SELECT 1 FROM public.student_teachers st WHERE st.teacher_id = auth.uid() AND st.student_id = assigned_tasks.student_id)
    )
  )
  WITH CHECK (
    company_id = public.get_current_user_company_id() AND
    (
      public.is_active_admin(auth.uid()) OR
      (auth.uid() = assigned_by_id AND public.is_active_admin_or_teacher(auth.uid())) OR
      public.can_student_or_parent_mark_task_complete(id)
    )
  );


-- === Table: ticket_transactions ===
DROP POLICY IF EXISTS "Ticket Transactions: Allow admin read access" ON public.ticket_transactions;
DROP POLICY IF EXISTS "Ticket Transactions: Allow students read own" ON public.ticket_transactions;
DROP POLICY IF EXISTS "Ticket Transactions: Allow parents read children" ON public.ticket_transactions;
DROP POLICY IF EXISTS "Ticket Transactions: Allow teachers read linked students" ON public.ticket_transactions;

CREATE POLICY "Ticket Transactions: Allow related users to read within company" ON public.ticket_transactions
  FOR SELECT TO authenticated USING (
    company_id = public.get_current_user_company_id() AND (
        public.is_active_admin(auth.uid()) OR
        auth.uid() = student_id OR
        EXISTS (SELECT 1 FROM public.parent_students ps WHERE ps.parent_id = auth.uid() AND ps.student_id = ticket_transactions.student_id) OR
        EXISTS (SELECT 1 FROM public.student_teachers st WHERE st.teacher_id = auth.uid() AND st.student_id = ticket_transactions.student_id)
    )
  );


-- === Link Tables (student_teachers, parent_students, etc) ===
-- The original policies for these are fine, but need the company_id check.
-- Example for student_teachers:
DROP POLICY IF EXISTS "Student Teachers: Allow related read access" ON public.student_teachers;
DROP POLICY IF EXISTS "Student Teachers: Allow admin write access" ON public.student_teachers;

CREATE POLICY "Student Teachers: Allow related read access in company" ON public.student_teachers
  FOR SELECT TO authenticated USING (
    -- The check for the linked profiles' company_id implicitly handles security
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = student_teachers.student_id AND p.company_id = public.get_current_user_company_id())
    AND (
      public.is_active_admin(auth.uid()) OR
      auth.uid() = student_id OR
      auth.uid() = teacher_id OR
      EXISTS (SELECT 1 FROM public.parent_students ps WHERE ps.parent_id = auth.uid() AND ps.student_id = student_teachers.student_id)
    )
  );

CREATE POLICY "Student Teachers: Allow admin write access in company" ON public.student_teachers
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = student_teachers.student_id AND p.company_id = public.get_current_user_company_id())
    AND public.is_active_admin(auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = student_teachers.student_id AND p.company_id = public.get_current_user_company_id())
    AND public.is_active_admin(auth.uid())
  );