-- StudyOS: Tests & Quizzes + Day Plan
-- ADDITIVE and IDEMPOTENT migration. Safe to run multiple times.
-- Run this in the Supabase SQL editor. DO NOT run schema.sql (it DROPs tables).
-- Touches only: test_items, test_attempts, test_schedule and their own functions/triggers/policies.

-- 1. test_items (library of tests and quizzes)
CREATE TABLE IF NOT EXISTS public.test_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  kind text NOT NULL CHECK (kind IN ('test', 'quiz')),
  category text NOT NULL,
  series text NOT NULL DEFAULT 'other'
    CHECK (series IN ('topic', 'subject', 'rapid', 'mixed', 'mock', 'aptitude', 'weekly', 'monthly', 'other')),
  title text NOT NULL,
  topics text,
  tier text CHECK (tier IN ('free', 'premium')),
  is_available boolean NOT NULL DEFAULT true,
  url text,
  notes text,
  display_order integer NOT NULL DEFAULT 0,
  attempt_count integer NOT NULL DEFAULT 0,
  last_attempted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE (user_id, kind, category, title)
);

-- 2. test_attempts (each time a test/quiz was given)
CREATE TABLE IF NOT EXISTS public.test_attempts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id uuid REFERENCES public.test_items(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  attempted_at timestamp with time zone DEFAULT now() NOT NULL,
  score numeric(8,2),
  max_score numeric(8,2),
  duration_min integer CHECK (duration_min IS NULL OR duration_min >= 0),
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. test_schedule (day plan: which item on which date)
CREATE TABLE IF NOT EXISTS public.test_schedule (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  item_id uuid REFERENCES public.test_items(id) ON DELETE CASCADE NOT NULL,
  planned_date date NOT NULL, -- plain local date, never converted via UTC
  display_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'done', 'skipped')),
  time_slot text,
  attempt_id uuid REFERENCES public.test_attempts(id) ON DELETE SET NULL, -- attempt auto-created when marked done
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE (item_id, planned_date)
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_test_items_user_kind_cat ON public.test_items (user_id, kind, category);
CREATE INDEX IF NOT EXISTS idx_test_attempts_item ON public.test_attempts (item_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_attempts_user ON public.test_attempts (user_id);
CREATE INDEX IF NOT EXISTS idx_test_schedule_user_date ON public.test_schedule (user_id, planned_date);

-- 5. updated_at trigger (own function, does not touch existing ones)
CREATE OR REPLACE FUNCTION public.tq_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tq_test_items_updated_at ON public.test_items;
CREATE TRIGGER tq_test_items_updated_at
  BEFORE UPDATE ON public.test_items
  FOR EACH ROW EXECUTE FUNCTION public.tq_set_updated_at();

DROP TRIGGER IF EXISTS tq_test_schedule_updated_at ON public.test_schedule;
CREATE TRIGGER tq_test_schedule_updated_at
  BEFORE UPDATE ON public.test_schedule
  FOR EACH ROW EXECUTE FUNCTION public.tq_set_updated_at();

-- 6. Keep test_items.attempt_count / last_attempted_at in sync with test_attempts
CREATE OR REPLACE FUNCTION public.tq_sync_attempt_stats()
RETURNS trigger AS $$
DECLARE
  v_item_id uuid;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    v_item_id := OLD.item_id;
  ELSE
    v_item_id := NEW.item_id;
  END IF;

  UPDATE public.test_items
  SET
    attempt_count = (SELECT count(*) FROM public.test_attempts WHERE item_id = v_item_id),
    last_attempted_at = (SELECT max(attempted_at) FROM public.test_attempts WHERE item_id = v_item_id)
  WHERE id = v_item_id;

  -- If an UPDATE moved the attempt to another item, refresh the old one too
  IF (TG_OP = 'UPDATE' AND OLD.item_id <> NEW.item_id) THEN
    UPDATE public.test_items
    SET
      attempt_count = (SELECT count(*) FROM public.test_attempts WHERE item_id = OLD.item_id),
      last_attempted_at = (SELECT max(attempted_at) FROM public.test_attempts WHERE item_id = OLD.item_id)
    WHERE id = OLD.item_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tq_on_attempt_change ON public.test_attempts;
CREATE TRIGGER tq_on_attempt_change
  AFTER INSERT OR UPDATE OR DELETE ON public.test_attempts
  FOR EACH ROW EXECUTE FUNCTION public.tq_sync_attempt_stats();

-- 7. Row Level Security (same email-gated style as the existing tables)
ALTER TABLE public.test_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tq: authorized user only on test_items" ON public.test_items;
CREATE POLICY "tq: authorized user only on test_items"
ON public.test_items
FOR ALL
USING (auth.jwt() ->> 'email' = 'tanmayraj1705@gmail.com' AND auth.uid() = user_id)
WITH CHECK (auth.jwt() ->> 'email' = 'tanmayraj1705@gmail.com' AND auth.uid() = user_id);

DROP POLICY IF EXISTS "tq: authorized user only on test_attempts" ON public.test_attempts;
CREATE POLICY "tq: authorized user only on test_attempts"
ON public.test_attempts
FOR ALL
USING (auth.jwt() ->> 'email' = 'tanmayraj1705@gmail.com' AND auth.uid() = user_id)
WITH CHECK (auth.jwt() ->> 'email' = 'tanmayraj1705@gmail.com' AND auth.uid() = user_id);

DROP POLICY IF EXISTS "tq: authorized user only on test_schedule" ON public.test_schedule;
CREATE POLICY "tq: authorized user only on test_schedule"
ON public.test_schedule
FOR ALL
USING (auth.jwt() ->> 'email' = 'tanmayraj1705@gmail.com' AND auth.uid() = user_id)
WITH CHECK (auth.jwt() ->> 'email' = 'tanmayraj1705@gmail.com' AND auth.uid() = user_id);

-- 8. Grants (scoped to the new objects only)
GRANT ALL ON public.test_items, public.test_attempts, public.test_schedule TO authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.tq_set_updated_at(), public.tq_sync_attempt_stats() TO authenticated, service_role, postgres;
