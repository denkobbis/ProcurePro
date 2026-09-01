-- checkLoginRateLimit only recorded a failed attempt *after* signInWithPassword
-- rejected it -- unlike checkSignupRateLimit/checkPasswordResetRateLimit, which
-- both record before calling their external Supabase Auth API. That asymmetry
-- is a real race: a burst of concurrent wrong-password attempts from the same
-- IP could all read the same stale count before any of them had recorded its
-- own failure, letting the whole burst through regardless of
-- LOGIN_MAX_PER_WINDOW. Fixing this means recording the attempt before the
-- external call (matching the other two), then removing it if login succeeds
-- so a legitimate sign-in still doesn't count against the failed-attempts
-- limit -- which needs two small RPCs, since auth_attempts_select was
-- intentionally dropped (see 0051): a plain insert().select() can't read back
-- the new row's id without SELECT permission, and there's no DELETE policy.

create or replace function public.record_auth_attempt(p_ip_address text, p_attempt_type text)
returns bigint
language sql
security definer
set search_path = 'public'
as $$
  insert into auth_attempts (ip_address, attempt_type) values (p_ip_address, p_attempt_type) returning id;
$$;

create or replace function public.clear_auth_attempt(p_attempt_id bigint)
returns void
language sql
security definer
set search_path = 'public'
as $$
  delete from auth_attempts where id = p_attempt_id;
$$;

grant execute on function public.record_auth_attempt(text, text) to anon, authenticated;
grant execute on function public.clear_auth_attempt(bigint) to anon, authenticated;
