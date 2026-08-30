-- Follow-up to the audit (item #4): updateVendorPayout verifies a new
-- account number via Paystack's resolveAccountNumber before saving it, but
-- vendors_write's blanket is_procurement_or_admin() policy lets anyone in
-- those roles overwrite bank_name/account_number directly via a raw client
-- call, skipping that verification entirely. Paystack transfers are safe
-- either way (they reference a pre-verified recipient_code, not the raw
-- account number), but Flutterwave transfers use the live account_number
-- column directly — so a raw write could redirect a Flutterwave payout to
-- an unverified account.
--
-- RLS alone can't express "this column, not that one" (same reason
-- profiles_update_self needed a trigger, not just a policy) — column-level
-- GRANT/REVOKE is the right primitive here. Revoking UPDATE on the banking
-- columns from `authenticated` blocks any raw client write to them; the new
-- update_vendor_payout RPC (security definer) still writes them normally,
-- since it runs as the function owner, not the calling role.

revoke update (bank_name, account_number, account_name, paystack_recipient_code, flutterwave_bank_code) on vendors from authenticated;

create or replace function update_vendor_payout(
  p_vendor_id uuid,
  p_bank_name text,
  p_account_number text,
  p_account_name text,
  p_paystack_recipient_code text,
  p_flutterwave_bank_code text
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_procurement_or_admin() then
    raise exception 'Only procurement officers or admins can set vendor payout details';
  end if;

  update vendors
    set bank_name = p_bank_name,
        account_number = p_account_number,
        account_name = p_account_name,
        paystack_recipient_code = p_paystack_recipient_code,
        flutterwave_bank_code = p_flutterwave_bank_code
    where id = p_vendor_id and organization_id = current_organization_id();

  if not found then raise exception 'Vendor not found'; end if;
end;
$$;
