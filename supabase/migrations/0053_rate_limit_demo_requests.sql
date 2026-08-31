-- submitDemoRequest (the public "request a demo" lead-capture form) had no
-- rate limiting at all -- only a honeypot field, which a scripted bot can
-- just not fill in. Anyone could script unlimited submissions to
-- marketing_leads. Low severity (insert-only, no SELECT policy exists on
-- marketing_leads, so this is a spam/pollution risk, not a data leak), but
-- worth closing with the same IP-based pattern already used for
-- login/signup/password-reset.
--
-- Reuses auth_attempts + count_auth_attempts rather than a new table/RPC --
-- widen the attempt_type check to include 'demo_request'.

alter table auth_attempts drop constraint auth_attempts_attempt_type_check;
alter table auth_attempts add constraint auth_attempts_attempt_type_check
  check (attempt_type = any (array['login', 'password_reset', 'demo_request']));
