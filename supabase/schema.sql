-- StudyOS PostgreSQL Schema
-- Centralized personal study operating system schema with automatic hours calculation triggers and strict Row Level Security.

-- Enable extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables/functions if they exist to allow clean runs
-- Drop existing tables first (cascade drops triggers too)
DROP TABLE IF EXISTS public.activity_log CASCADE;
DROP TABLE IF EXISTS public.roadmap_items CASCADE;
DROP TABLE IF EXISTS public.roadmap CASCADE;
DROP TABLE IF EXISTS public.revisions CASCADE;
DROP TABLE IF EXISTS public.lecture_links CASCADE;
DROP TABLE IF EXISTS public.lectures CASCADE;
DROP TABLE IF EXISTS public.modules CASCADE;
DROP TABLE IF EXISTS public.subjects CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.pyq_progress CASCADE;

-- Clean up auth triggers and trigger functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user;
DROP FUNCTION IF EXISTS public.recalculate_hours_trigger;
DROP FUNCTION IF EXISTS public.recalculate_module_change_trigger;

-- 1. profiles table (synchronized with auth.users)
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  daily_target_hours numeric(4,2) NOT NULL DEFAULT 4.00,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. subjects table
CREATE TABLE public.subjects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  icon text,
  color text,
  display_order integer NOT NULL DEFAULT 0,
  estimated_hours numeric(6,2) NOT NULL DEFAULT 0.00,
  completed_hours numeric(6,2) NOT NULL DEFAULT 0.00,
  roadmap_days integer NOT NULL DEFAULT 120,
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE (user_id, name)
);

-- 3. modules table
CREATE TABLE public.modules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  is_collapsed boolean NOT NULL DEFAULT false,
  is_important boolean NOT NULL DEFAULT false,
  estimated_hours numeric(6,2) NOT NULL DEFAULT 0.00,
  completed_hours numeric(6,2) NOT NULL DEFAULT 0.00,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 4. lectures table
CREATE TABLE public.lectures (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id uuid REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  estimated_hours numeric(6,2) NOT NULL DEFAULT 0.00,
  completed_hours numeric(6,2) NOT NULL DEFAULT 0.00,
  display_order integer NOT NULL DEFAULT 0,
  is_marked_for_revision boolean NOT NULL DEFAULT false,
  importance_level text NOT NULL DEFAULT 'NONE' CHECK (importance_level IN ('NONE', 'LOW', 'MEDIUM', 'HIGH')),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 5. lecture_links table
CREATE TABLE public.lecture_links (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lecture_id uuid REFERENCES public.lectures(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  url text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 6. revisions table
CREATE TABLE public.revisions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lecture_id uuid REFERENCES public.lectures(id) ON DELETE CASCADE NOT NULL,
  revision_date timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  revision_number integer NOT NULL,
  comments text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. roadmap table
CREATE TABLE public.roadmap (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  day_number integer NOT NULL,
  planned_hours numeric(6,2) NOT NULL DEFAULT 0.00,
  planned_date date not null,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(subject_id, day_number)
);

-- 8. roadmap_items table
CREATE TABLE public.roadmap_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  roadmap_day_id uuid REFERENCES public.roadmap(id) ON DELETE CASCADE NOT NULL,
  lecture_id uuid REFERENCES public.lectures(id) ON DELETE CASCADE NOT NULL,
  planned_hours numeric(6,2) NOT NULL DEFAULT 0.00,
  display_order integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(roadmap_day_id, lecture_id)
);

-- 9. activity_log table
CREATE TABLE public.activity_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  activity_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid not null,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 10. pyq_progress table
CREATE TABLE public.pyq_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  question_id text NOT NULL,
  attempted boolean NOT NULL DEFAULT false,
  solved boolean NOT NULL DEFAULT false,
  incorrect boolean NOT NULL DEFAULT false,
  bookmarked boolean NOT NULL DEFAULT false,
  marked_for_review boolean NOT NULL DEFAULT false,
  attempt_count integer NOT NULL DEFAULT 0,
  time_taken integer NOT NULL DEFAULT 0,
  last_attempt timestamp with time zone,
  first_solved timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, question_id)
);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecture_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pyq_progress ENABLE ROW LEVEL SECURITY;

-- CREATE RLS SECURITY POLICIES (Strictly restrict to authorized email)
-- 1. Profiles Policy
CREATE POLICY "Allow read/write access to profiles for authorized user only"
ON public.profiles
FOR ALL
USING (auth.jwt() ->> 'email' = 'tanmayraj1705@gmail.com' AND auth.uid() = id);

-- 2. Subjects Policy
CREATE POLICY "Allow read/write access to subjects for authorized user only"
ON public.subjects
FOR ALL
USING (auth.jwt() ->> 'email' = 'tanmayraj1705@gmail.com' AND auth.uid() = user_id);

-- 3. Modules Policy
CREATE POLICY "Allow read/write access to modules for authorized user only"
ON public.modules
FOR ALL
USING (
  exists (
    SELECT 1 FROM public.subjects s
    WHERE s.id = modules.subject_id
    AND s.user_id = auth.uid()
  )
  AND auth.jwt() ->> 'email' = 'tanmayraj1705@gmail.com'
);

-- 4. Lectures Policy
CREATE POLICY "Allow read/write access to lectures for authorized user only"
ON public.lectures
FOR ALL
USING (
  exists (
    SELECT 1 FROM public.modules m
    JOIN public.subjects s on s.id = m.subject_id
    WHERE m.id = lectures.module_id
    AND s.user_id = auth.uid()
  )
  AND auth.jwt() ->> 'email' = 'tanmayraj1705@gmail.com'
);

-- 5. Lecture Links Policy
CREATE POLICY "Allow read/write access to links for authorized user only"
ON public.lecture_links
FOR ALL
USING (
  exists (
    SELECT 1 FROM public.lectures l
    JOIN public.modules m on m.id = l.module_id
    JOIN public.subjects s on s.id = m.subject_id
    WHERE l.id = lecture_links.lecture_id
    AND s.user_id = auth.uid()
  )
  AND auth.jwt() ->> 'email' = 'tanmayraj1705@gmail.com'
);

-- 6. Revisions Policy
CREATE POLICY "Allow read/write access to revisions for authorized user only"
ON public.revisions
FOR ALL
USING (
  exists (
    SELECT 1 FROM public.lectures l
    JOIN public.modules m on m.id = l.module_id
    JOIN public.subjects s on s.id = m.subject_id
    WHERE l.id = revisions.lecture_id
    AND s.user_id = auth.uid()
  )
  AND auth.jwt() ->> 'email' = 'tanmayraj1705@gmail.com'
);

-- 7. Roadmap Policy
CREATE POLICY "Allow read/write access to roadmap for authorized user only"
ON public.roadmap
FOR ALL
USING (
  exists (
    SELECT 1 FROM public.subjects s
    WHERE s.id = roadmap.subject_id
    AND s.user_id = auth.uid()
  )
  AND auth.jwt() ->> 'email' = 'tanmayraj1705@gmail.com'
);

-- 8. Roadmap Items Policy
CREATE POLICY "Allow read/write access to roadmap items for authorized user only"
ON public.roadmap_items
FOR ALL
USING (
  exists (
    SELECT 1 FROM public.roadmap r
    JOIN public.subjects s on s.id = r.subject_id
    WHERE r.id = roadmap_items.roadmap_day_id
    AND s.user_id = auth.uid()
  )
  AND auth.jwt() ->> 'email' = 'tanmayraj1705@gmail.com'
);

-- 9. Activity Log Policy
CREATE POLICY "Allow read/write access to activity log for authorized user only"
ON public.activity_log
FOR ALL
USING (auth.jwt() ->> 'email' = 'tanmayraj1705@gmail.com' AND auth.uid() = user_id);

-- 10. PYQ Progress Policy
CREATE POLICY "Allow read/write access to pyq_progress for authorized user only"
ON public.pyq_progress
FOR ALL
USING (auth.jwt() ->> 'email' = 'tanmayraj1705@gmail.com' AND auth.uid() = user_id);

-- TRIGGER FUNCTION FOR AUTOMATIC USER PROFILE SYNC
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    COALESCE(new.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- TRIGGER FUNCTION FOR AUTOMATIC HOURS RECALCULATION
CREATE OR REPLACE FUNCTION public.recalculate_hours_trigger()
RETURNS trigger AS $$
DECLARE
  v_module_id uuid;
  v_subject_id uuid;
BEGIN
  -- Get module_id
  IF (TG_OP = 'DELETE') THEN
    v_module_id := old.module_id;
  ELSE
    v_module_id := new.module_id;
  END IF;

  -- 1. Recalculate module hours
  UPDATE public.modules
  SET 
    estimated_hours = COALESCE((SELECT sum(estimated_hours) FROM public.lectures WHERE module_id = v_module_id), 0.00),
    completed_hours = COALESCE((SELECT sum(completed_hours) FROM public.lectures WHERE module_id = v_module_id), 0.00),
    updated_at = now()
  WHERE id = v_module_id
  RETURNING subject_id INTO v_subject_id;

  -- 2. Recalculate subject hours
  IF v_subject_id IS NOT NULL THEN
    UPDATE public.subjects
    SET 
      estimated_hours = COALESCE((SELECT sum(estimated_hours) FROM public.modules WHERE subject_id = v_subject_id), 0.00),
      completed_hours = COALESCE((SELECT sum(completed_hours) FROM public.modules WHERE subject_id = v_subject_id), 0.00),
      updated_at = now()
    WHERE id = v_subject_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_lecture_change
  AFTER INSERT OR UPDATE OR DELETE ON public.lectures
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_hours_trigger();

-- TRIGGER FUNCTION FOR MODULE MOVE RECALCULATION
CREATE OR REPLACE FUNCTION public.recalculate_module_change_trigger()
RETURNS trigger AS $$
BEGIN
  -- If subject_id changed, recalculate old subject
  IF (TG_OP = 'UPDATE' AND old.subject_id <> new.subject_id) THEN
    UPDATE public.subjects
    SET 
      estimated_hours = COALESCE((SELECT sum(estimated_hours) FROM public.modules WHERE subject_id = old.subject_id), 0.00),
      completed_hours = COALESCE((SELECT sum(completed_hours) FROM public.modules WHERE subject_id = old.subject_id), 0.00),
      updated_at = now()
    WHERE id = old.subject_id;
  END IF;

  -- Recalculate current subject
  UPDATE public.subjects
  SET 
    estimated_hours = COALESCE((SELECT sum(estimated_hours) FROM public.modules WHERE subject_id = new.subject_id), 0.00),
    completed_hours = COALESCE((SELECT sum(completed_hours) FROM public.modules WHERE subject_id = new.subject_id), 0.00),
    updated_at = now()
  WHERE id = new.subject_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_module_change
  AFTER UPDATE OR DELETE ON public.modules
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_module_change_trigger();

-- GRANT permissions to standard roles for API consumption
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role, postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role, postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role, postgres;
