ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS membership_status varchar(10) NOT NULL DEFAULT 'approved'
  CHECK (membership_status IN ('pending', 'approved'));

CREATE INDEX IF NOT EXISTS idx_profiles_membership_status
  ON public.profiles(membership_status)
  WHERE role = 'resident';

-- 일반 사용자가 Supabase API를 직접 호출해 자신을 승인하는 것을 막는다.
CREATE OR REPLACE FUNCTION public.protect_membership_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.membership_status IS DISTINCT FROM NEW.membership_status
     AND auth.role() <> 'service_role'
     AND NOT EXISTS (
       SELECT 1 FROM public.profiles
       WHERE id = auth.uid() AND role = 'admin' AND admin_status = 'approved'
     ) THEN
    RAISE EXCEPTION 'membership_status can only be changed by an approved administrator';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_membership_status ON public.profiles;
CREATE TRIGGER protect_membership_status
  BEFORE UPDATE OF membership_status ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_membership_status();
