# ProcurePro

Procurement management for small-to-mid-size companies — one place to request, approve, track, and report on every purchase, from initial request to receiving the goods.

Built with Next.js (App Router, Server Actions) and Supabase (Postgres, Auth, Storage).

## What's implemented

Full core flow: purchase request → threshold-based approval → purchase order → receiving → reporting.

- **Auth & roles**: email/password via Supabase Auth, 5 roles (requester, approver, procurement officer, finance/admin, super admin), enforced by Postgres RLS — never trust the frontend alone.
- **Purchase requests**: draft/submit, attachments (Supabase Storage), comments, status trail.
- **Approval workflow**: configurable amount-threshold routing (`approval_rules` table), sequential steps, approve/reject/request-info, delegation for a date range, full audit log.
- **Budgets**: allocate per department/category/period; dashboard shows allocated vs. committed (pending requests) vs. spent (POs raised); optional hard-block vs. soft-warning on overspend.
- **Purchase orders**: generate from an approved request, editable vendor/delivery terms/line items, printable (browser print → save as PDF).
- **Vendors**: directory, approval toggle, documents, free-text performance notes.
- **Receiving**: partial/full receipt per line item with a pass/fail quality check; PO status advances automatically.
- **Reports**: spend by department/category/vendor, 6-month spend trend, company-wide pending-approvals overview, CSV export on every chart.
- **Notifications**: in-app notification center, plus email via Resend for request submitted, approval needed, approved/rejected, more-info-requested, PO sent, and items received. Email is optional infrastructure — the app works fine with `RESEND_API_KEY` unset, it just skips sending.
- **Error monitoring**: Sentry captures server, edge, and client errors in production (source maps uploaded at build time). Optional — with `NEXT_PUBLIC_SENTRY_DSN` unset, `Sentry.init` just no-ops.

Not built (stretch goal per the original spec, not attempted): WhatsApp notifications.

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (free tier is fine).
2. **Copy env vars**: `cp .env.local.example .env.local` and fill in the Project URL, anon key, and service_role key from Settings → API.
3. **Run the migrations** in `supabase/migrations/` in order (0001 through 0006) via the Supabase SQL editor, or `supabase db push` if you've linked the CLI.
4. **Create the storage bucket** — migration `0003_storage.sql` creates the `attachments` bucket and its policies for you; nothing to do manually.
5. **(Optional) Set up email** — sign up at [resend.com](https://resend.com), create an API key, paste it into `RESEND_API_KEY` in `.env.local`. Until you verify your own sending domain in Resend, you can only send to the email address you signed up with — fine for testing, not for real users yet.
6. **Seed sample data**: `npm run seed` — creates 2 departments (Operations, Finance), 3 users (one per key role), 2 vendors, an approval threshold chain, and starter budgets. Prints sign-in credentials when done.
7. **Run the app**: `npm run dev`, then sign in with one of the seeded accounts.
8. **(Optional) Set up error monitoring** — create a Next.js project at [sentry.io](https://sentry.io), copy its DSN from Settings → Client Keys into `NEXT_PUBLIC_SENTRY_DSN`, and (for readable production stack traces) create an org auth token with the `org:ci` scope at Settings → Auth Tokens into `SENTRY_AUTH_TOKEN`. Update the `org`/`project` in `next.config.ts`'s `withSentryConfig` call to match your own Sentry org/project slugs.

## Notes / simplifications made for MVP speed

- User invites are direct (admin sets a temporary password) rather than an email magic-link invite flow.
- The "convert to PO" form pre-fills one line item from the request; add more by extending the form (backend already accepts multiple `line_description`/`line_qty`/`line_unit_price` fields).
- PDF export is via the browser's native print dialog (Print → Save as PDF) rather than a server-rendered PDF — simpler and reliable without an extra dependency.
- Reports' "spend by category" derives category from each PO's originating request, since POs aren't created any other way in this build.
- All monetary values are formatted in Naira (₦); the schema uses plain `numeric` columns so adding currencies later doesn't require a migration.

## Troubleshooting

- **"Database error creating new user" on signup**: a SECURITY DEFINER Postgres function is missing an explicit `search_path`, so it can't resolve table names under Supabase's auth connection. Already fixed in this repo (migration `0004`) — if you hit this on a function you add later, add `set search_path = public` to its definition.
