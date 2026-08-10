-- Paystack's disable-subscription endpoint needs the subscription's
-- email_token (from the subscription.create webhook payload), not the
-- customer's actual email — captured here so an in-app "Cancel" button works.
alter table organizations add column paystack_email_token text;
