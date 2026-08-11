# ProcurePro — Build Progress

Procurement management SaaS, oil & gas / heavy-industry flavored (NCDMB compliance, customs/freight tracking, equipment leasing). Idea #1 from the original 10-SaaS strategic plan, but evolved well past that MVP's scope — see "Positioning" below.

## Key facts

- **App**: `C:\Users\Jesus\Desktop\ProcurePro` — Next.js 16 (App Router, Server Actions, TypeScript) + Supabase (Postgres, Auth, Storage). Git repo pushed to `github.com/denkobbis/ProcurePro`, linked to a Vercel project.
- **Supabase project**: `procurepro` (id `vkrmnfoaydfhkbghphlp`, org `denkobbis's Org`, region eu-central-1).
- A separate, throwaway Vite/React prototype was built against this same Supabase project on 2026-08-10 before this real app was discovered on disk — that prototype (`VIBE CODES/ProcurePro`) has been deleted. This is the one true app going forward.
- A companion app, **RigSource** (`rigsource.vercel.app`), is linked from the sidebar as an external "AI Sourcing" tool — separate codebase, not part of this repo.

## Positioning vs. the original 10-SaaS plan

The original plan's idea #1 was a lightweight vendor tracker for broad Nigerian SMEs, with Paystack/Flutterwave payment tracking as a stated competitive advantage ("no complex enterprise features vs. SAP/NetSuite"). What actually exists is the opposite: a full requisition → multi-step approval → RFQ → PO → shipping/customs → receiving workflow with budgets and audit logging — genuine enterprise procure-to-pay software, narrower vertical (oil & gas / heavy industry, per the NCDMB/local-content fields), no payment processing yet.

**Decision (2026-08-10): keep this direction.** Add payments + subscription billing on top of it rather than stripping back down to the original lightweight-SME scope. Go-to-market should target oil & gas / heavy-industry procurement teams specifically, not broad SMEs.

## Multi-tenancy (built 2026-08-10)

The app was single-tenant until today — no `organizations` concept existed; every signup landed in one shared pool, and there was no self-serve signup at all (only an admin-invite-with-temp-password flow). Since the plan's revenue model depends on many isolated customer accounts, this was the prerequisite for both payments and billing, so it went first.

**What changed** (migrations `0012`–`0016` in `supabase/migrations/`):
- New `organizations` table; `organization_id` added to every top-level table (`profiles`, `departments`, `vendors`, `budgets`, `approval_rules`, `requests`, `purchase_orders`, `equipment_assets`, `audit_log`, `notifications`, `delegations`). Child tables stay scoped transitively through their parent.
- Existing real data backfilled into one organization: **Denbis Global Resources**.
- Per-organization uniqueness (vendor/department names, PO/request numbers) — was global before, which would have caused collisions across future customers.
- Per-organization PO/request numbering (`next_po_number()`/`next_request_number()` now derive the org from the caller — same zero-arg signature, no call-site changes needed).
- **Every RLS policy rewritten.** Several had no organization boundary at all before this — `vendors_select`, `budgets_select`, `departments_select`, `profiles_select` were just "any authenticated user"; the `is_procurement_or_admin()` branches on `requests`/`purchase_orders`/`equipment_assets`/`audit_log`/RFQ tables checked role only, with zero org check. These were real cross-tenant data leaks in a single-tenant app that just happened not to matter yet — now fixed.
- **Every SECURITY DEFINER RPC updated** to check organization ownership of the rows it touches. RLS doesn't protect these functions (they bypass it by design) — a role check alone was not sufficient, since `is_procurement_or_admin()` is true for a matching role in *any* org.
- `convert_to_po`/`update_po` consolidated from two overloads down to one each (the app only ever called the 8-param currency-aware version; the 4-param one was dead code).
- Storage (`attachments` bucket) policies scoped by organization via the request/vendor the file belongs to — was bucket-only before (any signed-in user of any org could read/write any file).
- New self-serve signup at `/signup` — creates an organization and its first `super_admin`. Existing companies still add teammates via the admin-invite flow (Users & Departments), which now stamps the new user into the inviter's own organization.
- `scripts/seed.mjs` updated to create/use an organization (`ProcurePro Demo`) — would have broken outright under the new `NOT NULL organization_id` + per-org-unique constraints otherwise.

**Bug caught during verification, fixed same day**: the helper functions (`current_organization_id()`, `current_department_id()`, `current_profile_role()`, `is_admin_role()`, `is_procurement_or_admin()`) were `SECURITY INVOKER`. `current_organization_id()`'s internal `SELECT ... FROM profiles` re-triggered `profiles_select`'s RLS check, which itself calls `current_organization_id()` — infinite recursion, would have broken every profile lookup in the running app. Fixed by making all five `SECURITY DEFINER` (migration `0015`), the standard Supabase pattern for this class of helper. Caught by a two-org isolation smoke test *before* it reached the app, not after.

**Verified**: created a real second organization end-to-end through the actual signup trigger, confirmed zero data visibility in both directions (test org sees nothing of Denbis Global Resources' data; Denbis sees nothing of the test org), then deleted the test org/user. Confirmed no new entries in Supabase's security advisor beyond pre-existing warnings.

## Payments (built 2026-08-10, second feature this day)

Vendor disbursement via Paystack and Flutterwave Transfers APIs — finance/admin pays a vendor's PO total directly to their bank account from inside the app. This is the "pay vendors automatically" direction (not "just track a manual payment reference") — real money moves through the app once live keys are configured.

**Schema** (migration `0017`): `vendors` gained `bank_name`/`account_number`/`account_name`/`paystack_recipient_code`; `purchase_orders` gained `payment_status` (`unpaid`/`processing`/`paid`/`failed`); new `payments` table is a full audit trail (one row per attempt, not just a status field) — `organization_id`-scoped RLS, select open to procurement+admin, write restricted to `is_admin_role()` only (moving money is a stricter bar than editing a PO).

**How it works**:
- `src/lib/paystack.ts` / `src/lib/flutterwave.ts` — thin fetch-based API clients (no SDK deps), unlike `lib/email.ts`'s "optional infra, no-op if unset" pattern these **throw** if their secret key is missing, since a payment caller needs to know it didn't happen.
- Vendor payout setup (`/vendors/[id]`): pick a bank from Paystack's live bank list, enter account number, `updateVendorPayout` resolves the account name via Paystack (catches typos before money moves) and creates the Paystack transfer recipient up front, caching `recipient_code` so a later payment doesn't re-verify.
- PO payment (`/purchase-orders/[id]`): `initiatePayment` pays `total_amount_ngn` specifically — **not** landed cost — freight/customs are logistics costs, not owed to the vendor. Inserts a `pending` payment row *before* calling the provider (so a timeout/crash still leaves a record), then calls Paystack (via the cached recipient) or Flutterwave (resolves its own bank code by matching `bank_name` against Flutterwave's live bank list — the two providers use different code numbering for the same banks, a known fragility if a bank's name doesn't match exactly between them).
- Paystack transfers may require OTP finalization depending on the account's dashboard settings (`disable OTP for transfers` or not) — `finalizePaystackPayment` + an OTP input on any pending Paystack payment handles this; harmless no-op if OTP wasn't actually required.
- Webhooks: `src/app/api/webhooks/{paystack,flutterwave}/route.ts` verify signatures (Paystack: HMAC-SHA512 of the raw body with the secret key; Flutterwave: a dashboard-configured `verif-hash` string) and use the **service-role client** to update `payments`/`purchase_orders.payment_status` on `transfer.success`/`transfer.failed`/`transfer.reversed` — there's no signed-in user on a webhook request, only a verified signature.

**Verified**: full typecheck + lint clean. Confirmed in the real running app (logged in as a real Denbis user) that both the vendor payout section and PO payment section render correctly and degrade gracefully — clear "PAYSTACK_SECRET_KEY is not set" message, no crash — before keys were configured. **User added live Paystack/Flutterwave secret keys to `.env.local` directly** (not handled by the assistant — API keys and account/bank numbers are things it won't type into any field itself, even when a user offers to paste them). Confirmed the live Paystack key works: the vendor payout page loads Paystack's real ~370-bank list.

**Important correction mid-build**: the user initially thought "Paystack integration" meant subscription billing (charging customers to use ProcurePro), not vendor disbursement (the app paying vendors) — the two were disambiguated explicitly (see "Subscription billing" below) before proceeding, since they're different integrations against different tables (`vendors`/`purchase_orders` vs. `organizations`).

**Not yet done**:
- No live *transfer* has actually been completed — bank verification (`resolveAccountNumber`/`createTransferRecipient`) was confirmed working, but the user needs to enter a real account number themselves (assistant won't type one in) and click "Pay via Paystack/Flutterwave" to complete an actual test transfer — deliberately not done automatically given it's live money.
- No webhook URL registered yet in either dashboard (needs a public URL — ngrok for local testing, or the real deployed URL) — without it, `payment_status` won't automatically flip to "paid" after a transfer completes.

**Update (hardening pass, same day)**: partial/staged payments now supported (see below) and the Flutterwave bank-matching fragility is mitigated (also below) — both originally listed here as gaps.

## Subscription billing (built 2026-08-10, third feature this day)

Customers pay ProcurePro (money **in**, opposite direction from vendor payments above) — the actual SaaS revenue mechanism. One flat plan, Paystack only (has a purpose-built Subscriptions API; Flutterwave's recurring support is comparatively thinner), ₦25,000/month, 14-day trial, **read-only lockout** on lapse (all three decisions made explicitly with the user before building).

**Schema** (migration `0018`): `organizations` gained `subscription_status` (`trialing`/`active`/`past_due`/`canceled`), `trial_ends_at`, `paystack_customer_code`, `paystack_subscription_code`, `current_period_end`. **Denbis Global Resources was explicitly grandfathered to `active`** — its trial clock does not retroactively start today just because billing was built today.

**How it works**:
- `scripts/create-paystack-plan.mjs` — one-off setup script, run once with the user's explicit go-ahead (creating a plan on a *live* account is an account-settings change) — created the real ₦25,000/month Paystack plan (`PLN_0ls5lbnb5o1cqau`, in `PAYSTACK_PLAN_CODE`, not a secret so the assistant added it directly).
- `lib/auth.ts`: `getCurrentOrganization()`, `isOrgLocked()` (status is `past_due`/`canceled`, OR `trialing` past `trial_ends_at` — trial expiry is a clock check, not a stored flag), `requireActiveOrg()` — throws a clear error, called at the top of every mutating server action across the app (see coverage below). Deliberately **not** called from `actions/auth.ts` or `actions/billing.ts` (a locked-out admin still needs to log in and subscribe) or `actions/notifications.ts` (marking a notification read isn't a business mutation worth blocking).
- `startSubscription()` initializes a Paystack transaction with the plan code and redirects to Paystack's hosted checkout — the app never collects a card number itself. `/billing/callback` verifies the transaction and flips status to `active` immediately (for fast UI feedback); the `subscription.create`/`charge.success`/`invoice.payment_failed`/`subscription.disable` webhook events (added to the *same* Paystack webhook route that already handles vendor transfers, branched by event-name prefix) are the authoritative source for `current_period_end` and ongoing renewal/dunning status.
- `(app)/layout.tsx` shows a persistent banner: red "read-only" when locked, amber "trial ends in Nd" when ≤3 days left — visible on every page, not just `/billing`.

**Bug caught and fixed while wiring the webhook**: pasted the wrong column name (`subscription_code` instead of `paystack_subscription_code`) into the `subscription.create` handler — caught on re-read before it ever ran, not after a broken webhook silently failed in production.

**Verified**: full typecheck clean. Coverage-audited every action file (`grep` for every `export async function` vs. every `requireActiveOrg` call) to confirm all ~30 mutating actions across `approvals`/`budgets`/`equipment`/`payments`/`po`/`requests`/`rfq`/`users`/`vendors` are guarded, with the three deliberate exemptions above. **Live-verified the actual lockout in the real running app**: briefly flipped Denbis's own status to an expired trial, confirmed the red banner rendered, confirmed submitting "Add Vendor" was actually blocked server-side with the exact expected error message (visible in the browser console as a thrown Server Action error) and that no vendor row was created, then immediately reverted Denbis back to `active`. A second throwaway org/user used for an earlier login-flow attempt hit a dead end (a hand-crafted `auth.users` row was missing `raw_app_meta_data`, which GoTrue needs for password login — the multi-tenancy isolation test earlier never hit this because it only used SQL-level RLS impersonation, never a real interactive login) and was abandoned in favor of the direct Denbis-flip test instead; both throwaway orgs/users were deleted afterward.

**Not yet done**:
- No actual checkout has been completed — needs the user to click "Subscribe now" on `/billing` and enter real card details on Paystack's page themselves (the assistant won't do this — same reasoning as above).
- No webhook URL registered yet (shared blocker with vendor payments above).
- `past_due` has no dunning/retry-nudge UI beyond the persistent lockout banner.

**Update (hardening pass, same day)**: in-app subscription cancel and organization rename both now exist — both originally listed here as gaps.

## Hardening pass (built 2026-08-10, same day — "do everything that doesn't need me")

After the two features above, the user asked for every remaining known gap that didn't require their direct action (real bank account, real card, webhook registration, pricing-tier decisions) or wasn't code (go-to-market). All of the below is one session, migrations `0019`–`0024`.

- **Role self-assignment locked down** (`0019`): `profiles_update_self`'s RLS had no column-level restriction — a `requester` could set their own `role` to `super_admin` via a direct table update. RLS is row-level only and can't express "this column, not that one," so this needed a `BEFORE UPDATE` trigger instead: non-admins can edit their own profile, but not `role`/`organization_id`/`is_active`. **Verified live via RLS impersonation**: a requester self-promoting was blocked with the exact expected error; a requester editing their own name, and an admin deactivating another user, both still worked.
- **Signup rate limiting** (`0020`): new `signup_attempts` table, IP-based, max 5/hour, checked in `signUp` before calling Supabase auth. No new infra (no Redis) — a plain table is enough at this scale.
- **Friendly error boundary**: `(app)/error.tsx` — Server Action errors (like the lockout message) were surfacing as Next.js's generic "Application error" page; this catches them and shows the actual message with a "Try again" button.
- **Partial/staged PO payments** (`0021`): `po_payment_status` gained `partially_paid`. `initiatePayment` now accepts a custom amount (defaults to the full remaining balance, validated against it) instead of always paying the PO total in one shot. New `lib/po-payment-status.ts` centralizes the "what should the PO's status be" logic — used by both webhook routes and the action's own failure path — since a PO can have prior successful partial payments that a later failure or success must not blindly overwrite.
- **In-app subscription cancel** (`0022`): captured `paystack_email_token` from the `subscription.create` webhook payload (Paystack's disable-subscription endpoint needs this, not the customer's actual email) and added `cancelSubscription()` + a Cancel button on `/billing`.
- **Organization rename**: new `actions/organization.ts`, small form on `/billing`.
- **Flutterwave bank-matching hardened** (`0023`): `updateVendorPayout` now also resolves and caches `vendors.flutterwave_bank_code` at payout-setup time (best-effort, non-fatal), so `initiatePayment` no longer needs a fragile live name-match against Flutterwave's bank list on every payment — falls back to the old live-match only if the cache is empty (e.g. a vendor saved before this change).

**Real bug found and fixed via testing, not review** (`0024`): the `organizations` table has had RLS enabled with **only a SELECT policy** since the multi-tenancy migration — there was never an UPDATE policy. Every UPDATE to `organizations` (org rename, the billing checkout callback setting `subscription_status = 'active'`, subscription cancel) was silently succeeding with 0 rows affected — no error, just a no-op — because Postgres RLS with no matching policy excludes all rows rather than raising. This means **the checkout callback and cancel-subscription code, written and typechecked earlier the same day, had never actually worked**, and nothing would have caught it short of clicking the button. Caught by manually testing the org-rename form end-to-end (DB value didn't change despite a 200 response), traced to the missing policy, fixed with an admin-only `organizations_update` policy, and **re-verified live** — rename now persists correctly. The checkout callback and cancel-subscription paths share the exact same fix and are presumed fixed too, though neither has been re-tested live yet (both still need a real checkout/subscription to exist first).

**Verified**: full project-wide typecheck and lint clean after every change in this pass. Vendor payout page and PO detail page (with the new amount input) both re-confirmed rendering correctly in the real running app afterward.

## Industry toggle (built 2026-08-11)

Brainstormed with the user: the app as built is really oil & gas / heavy-industry-flavored procurement software (NCDMB compliance, currency, equipment leasing), but the underlying workflow (requests → approvals → RFQ → PO → receiving, budgets, vendors) is generic enough for other B2B-procurement verticals. Rather than building separate apps, added a per-organization "line of work" field that toggles which industry-specific UI shows — v1 scope only (a feature flag/config layer), not full terminology relabeling or route-level blocking, both deliberately deferred.

**Schema** (migrations `0025`–`0026`): new `organization_industry` enum (`oil_gas`, `construction`, `trading`, `general`); `organizations.industry` column, `not null default 'general'`, Denbis backfilled to `oil_gas`. `handle_new_user()` trigger updated to read `industry` from signup metadata (falls back to `general`).

**How it works**:
- `src/lib/industries.ts` — single source of truth: `INDUSTRIES` maps each industry to a `modules` boolean map (currently `equipment`, `ncdmb`); `INDUSTRY_OPTIONS` for dropdowns; `getIndustryModules()` helper. Oil & gas and the `general` fallback get both modules; construction and trading get neither (chosen as the safest default — no vertical gets features it didn't ask for).
- Picked at signup (`/signup` dropdown, defaults to General) or changed later by an admin on `/billing` → Organization → "Line of work" (`updateOrganizationSettings` in `actions/organization.ts`, replacing the old rename-only action).
- Consumed in three places: `Sidebar.tsx` filters out the Equipment nav link when `!modules.equipment`; `vendors/new` and `vendors/[id]` pass `showNcdmb={modules.ncdmb}` into `NcdmbFields` (hides the compliance fields, currency picker always shows); `purchase-orders/[id]` gates the "Local content (NCDMB)" display block the same way.

**Verified**: full typecheck + lint clean (lint was also cleaned up on one pre-existing, unrelated `Date.now()`-during-render error in `billing/page.tsx` line 22, hit while running a full lint pass — fixed by hoisting to `new Date()` once, since it was blocking a clean verification run). Live end-to-end in the real running app: confirmed Denbis (`oil_gas`) still sees Equipment + full NCDMB fields; used the real `/billing` form to flip Denbis to `trading`, confirmed the Equipment sidebar link disappeared and the vendor-add page collapsed to currency-only, then flipped back to `oil_gas` and re-confirmed everything restored. (Note: the Claude Browser tool's click-by-element-reference intermittently failed to register on that specific Save button for reasons unrelated to the app — worked every time once dispatched via a real DOM click event — not an app bug.)

**Deliberately deferred** (discussed with the user, not built): vendor/PO terminology relabeling per industry (e.g. "Vendor" vs "Supplier"), and route-level blocking of `/equipment` for industries that don't use it (currently just hidden from nav, not access-denied if visited directly).

## Status

| Area | Status |
|---|---|
| Core workflow (requests → approvals → RFQ → PO → receiving) | Done, pre-existing |
| Budgets, reports, equipment leasing, notifications, audit log | Done, pre-existing |
| Multi-tenancy (orgs, RLS, RPC org-checks, self-serve signup, storage scoping) | Done |
| Payment processing (Paystack/Flutterwave vendor disbursement, partial payments) | Built, bank verification confirmed live; no completed transfer yet |
| Subscription billing (plan, trial, lockout, cancel, org rename) | Built, lockout + rename verified live; no completed checkout yet |
| Security/abuse hardening (role lockdown, signup rate limit, error UX) | Done, verified live |
| Industry toggle (org line-of-work, conditional Equipment/NCDMB UI) | Done, verified live |

## Known open items

- **`organizations` RLS**: only `select` and the new `update` policies exist — no `insert`/`delete` policies, meaning org creation only works via the `SECURITY DEFINER` `handle_new_user()` trigger (correct — self-serve signup shouldn't allow arbitrary org creation any other way) and there's no path to delete an org from the app (also probably correct for now, but worth being aware it's not an oversight so much as an unmade decision).
- No rate limiting on webhook endpoints themselves (only signature verification) — low risk since an invalid signature is rejected before any DB write, but worth knowing.
- `past_due` subscriptions have no dunning/retry-nudge UI beyond the persistent lockout banner.
- Payments + billing live-money steps: see each section's "Not yet done" above — both are one real click away from a completed live test, deliberately left to the user.

## Next steps

1. Register both webhook URLs (needs a public URL — ngrok locally, or the real deployed one) in each provider's dashboard.
2. Complete one real test-mode-or-live transfer and one real subscription checkout, end to end — this will also be the first real test of the checkout-callback and cancel-subscription RLS fix above.
3. Go-to-market execution (oil & gas / heavy-industry procurement teams) — not code, still not started.
