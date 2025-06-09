-- V2 Golden Migration: Apply all Row Level Security (RLS) policies

----------------------------------------------------
-- PROFILES RLS
----------------------------------------------------
CREATE POLICY "Allow users to read profiles in their company" ON public.profiles
  FOR SELECT USING (company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid);

CREATE POLICY "Allow user to update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

----------------------------------------------------
-- COMPANIES RLS
----------------------------------------------------
CREATE POLICY "Allow authenticated users to read company names" ON public.companies
  FOR SELECT TO authenticated USING (true);

----------------------------------------------------
-- CORE ENTITIES RLS (Instruments, Rewards, Announcements, Task Library)
----------------------------------------------------
CREATE POLICY "Allow users to read entities in their company" ON public.instruments
  FOR SELECT USING (company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid);
CREATE POLICY "Allow admins to write entities in their company" ON public.instruments
  FOR ALL USING (is_active_admin(auth.uid()) AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid);

CREATE POLICY "Allow users to read rewards in their company" ON public.rewards
  FOR SELECT USING (company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid);
CREATE POLICY "Allow admins to write rewards in their company" ON public.rewards
  FOR ALL USING (is_active_admin(auth.uid()) AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid);

CREATE POLICY "Allow users to read announcements in their company" ON public.announcements
  FOR SELECT USING (company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid);
CREATE POLICY "Allow admins to write announcements in their company" ON public.announcements
  FOR ALL USING (is_active_admin(auth.uid()) AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid);

CREATE POLICY "Allow users to read task library in their company" ON public.task_library
  FOR SELECT USING (company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid);
CREATE POLICY "Allow teachers and admins to write task library items" ON public.task_library
  FOR ALL USING (
    is_active_admin_or_teacher(auth.uid()) AND
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );

----------------------------------------------------
-- TRANSACTIONAL DATA RLS (Assigned Tasks, Tickets, Practice Logs)
----------------------------------------------------
CREATE POLICY "Allow related users to access assigned tasks" ON public.assigned_tasks
  FOR ALL USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid AND
    (
      is_active_admin(auth.uid()) OR
      auth.uid() = student_id OR
      EXISTS (SELECT 1 FROM public.parent_students ps WHERE ps.parent_id = auth.uid() AND ps.student_id = assigned_tasks.student_id) OR
      EXISTS (SELECT 1 FROM public.student_teachers st WHERE st.teacher_id = auth.uid() AND st.student_id = assigned_tasks.student_id)
    )
  );

CREATE POLICY "Allow related users to read ticket history" ON public.ticket_transactions
  FOR SELECT USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid AND
    (
      is_active_admin(auth.uid()) OR
      auth.uid() = student_id OR
      EXISTS (SELECT 1 FROM public.parent_students ps WHERE ps.parent_id = auth.uid() AND ps.student_id = ticket_transactions.student_id) OR
      EXISTS (SELECT 1 FROM public.student_teachers st WHERE st.teacher_id = auth.uid() AND st.student_id = ticket_transactions.student_id)
    )
  );

CREATE POLICY "Allow related users to access practice logs" ON public.practice_logs
  FOR ALL USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid AND
    (
      is_active_admin(auth.uid()) OR
      auth.uid() = student_id OR
      EXISTS (SELECT 1 FROM public.parent_students ps WHERE ps.parent_id = auth.uid() AND ps.student_id = practice_logs.student_id)
    )
  );

----------------------------------------------------
-- LINK TABLES RLS
----------------------------------------------------
CREATE POLICY "Allow related users to read student-teacher links" ON public.student_teachers
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = student_teachers.student_id AND p.company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid));
CREATE POLICY "Allow admins to manage student-teacher links" ON public.student_teachers
  FOR ALL USING (is_active_admin(auth.uid()));

CREATE POLICY "Allow related users to read parent-student links" ON public.parent_students
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = parent_students.student_id AND p.company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid));
CREATE POLICY "Allow admins to manage parent-student links" ON public.parent_students
  FOR ALL USING (is_active_admin(auth.uid()));

CREATE POLICY "Allow related users to read student-instrument links" ON public.student_instruments
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = student_instruments.student_id AND p.company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid));
CREATE POLICY "Allow admins to manage student-instrument links" ON public.student_instruments
  FOR ALL USING (is_active_admin(auth.uid()));

CREATE POLICY "Allow admins/teachers to manage task-instrument links" ON public.task_library_instruments
  FOR ALL USING (is_active_admin_or_teacher(auth.uid()));

----------------------------------------------------
-- AUTH SUPPORT TABLES RLS (No policies - service_role only)
----------------------------------------------------
-- onetime_pins and active_refresh_tokens are intentionally left without
-- RLS policies, meaning they can only be accessed by service_role_key
-- from within secure Edge Functions.

----------------------------------------------------
-- PUSH TOKENS RLS
----------------------------------------------------
CREATE POLICY "Allow user to manage their own push tokens" ON public.push_tokens
  FOR ALL USING (auth.uid() = user_id);