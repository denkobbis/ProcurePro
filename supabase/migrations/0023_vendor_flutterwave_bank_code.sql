-- Resolved and cached at payout-setup time so a payment doesn't need a fragile
-- live bank-name match against Flutterwave's list every time.
alter table vendors add column flutterwave_bank_code text;
