-- Subscription billing (Paystack recurring charge, one flat ₦25,000/month
-- plan, 14-day trial). Applied directly against the live project via the
-- Supabase MCP server and captured here afterward for reproducibility.

create type org_subscription_status as enum ('trialing', 'active', 'past_due', 'canceled');

alter table organizations add column subscription_status org_subscription_status not null default 'trialing';
alter table organizations add column trial_ends_at timestamptz;
alter table organizations add column paystack_customer_code text;
alter table organizations add column paystack_subscription_code text;
alter table organizations add column current_period_end timestamptz;

-- New signups (handle_new_user's create-org path) get a real 14-day trial clock.
update organizations set trial_ends_at = created_at + interval '14 days' where trial_ends_at is null;
alter table organizations alter column trial_ends_at set not null;
alter table organizations alter column trial_ends_at set default (now() + interval '14 days');

-- Grandfather the existing real customer in — they were using the app before
-- billing existed, so their trial clock shouldn't retroactively start today.
update organizations set subscription_status = 'active' where name = 'Denbis Global Resources';
