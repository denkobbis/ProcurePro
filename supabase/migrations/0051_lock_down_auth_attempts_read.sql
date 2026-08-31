-- auth_attempts_select and signup_attempts_select were created with
-- `using (true)` for anon+authenticated (see 0046's comment: "must be
-- readable ... with no session at all"). That's true for the rate-limit
-- check itself, but the policy as written also lets anyone hit the raw
-- REST API directly and read every row -- every IP address and timestamp
-- of every login/signup/password-reset attempt across the whole platform,
-- no auth required. Beyond the IP-harvesting exposure, it also lets an
-- attacker watch their own count in real time and time their next batch of
-- guesses to land just under the window threshold, which undermines the
-- rate limiter it's meant to support.
--
-- Fix: drop the public SELECT policies (INSERT stays public -- an attempt
-- genuinely has to be recordable pre-auth) and replace the app's count
-- check with a SECURITY DEFINER RPC that returns only an integer, never
-- raw rows. Same shape as write_audit()/act_on_approval() elsewhere in
-- this schema: no direct read/write, only a narrow function.

drop policy if exists auth_attempts_select on auth_attempts;
drop policy if exists signup_attempts_select on signup_attempts;

create or replace function public.count_auth_attempts(p_ip_address text, p_attempt_type text, p_since timestamptz)
returns integer
language sql
stable
security definer
set search_path = 'public'
as $$
  select count(*)::integer from auth_attempts
  where ip_address = p_ip_address and attempt_type = p_attempt_type and created_at >= p_since;
$$;

create or replace function public.count_signup_attempts(p_ip_address text, p_since timestamptz)
returns integer
language sql
stable
security definer
set search_path = 'public'
as $$
  select count(*)::integer from signup_attempts
  where ip_address = p_ip_address and created_at >= p_since;
$$;

grant execute on function public.count_auth_attempts(text, text, timestamptz) to anon, authenticated;
grant execute on function public.count_signup_attempts(text, timestamptz) to anon, authenticated;
