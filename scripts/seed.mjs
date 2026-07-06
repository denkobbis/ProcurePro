// Seeds 2 departments, 3 users (one per key role), 2 vendors, one approval
// threshold chain, and a starter budget so the app can be exercised end to end.
//
// Usage:
//   1. Fill in .env.local (see .env.local.example) with your Supabase project's
//      URL, anon key, and service_role key.
//   2. Run the SQL in supabase/migrations/*.sql via the Supabase SQL editor
//      (or `supabase db push` if you have the CLI linked).
//   3. npm run seed

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Fill in .env.local first.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SEED_PASSWORD = "Passw0rd!123";

async function main() {
  console.log("Seeding departments...");
  const { data: departments, error: deptErr } = await supabase
    .from("departments")
    .upsert(
      [{ name: "Operations" }, { name: "Finance" }],
      { onConflict: "name" }
    )
    .select();
  if (deptErr) throw deptErr;

  const operations = departments.find((d) => d.name === "Operations");
  const finance = departments.find((d) => d.name === "Finance");

  console.log("Seeding users...");
  const users = [
    {
      email: "requester@procurepro.test",
      full_name: "Chinedu Okafor",
      role: "requester",
      department_id: operations.id,
    },
    {
      email: "approver@procurepro.test",
      full_name: "Amaka Bello",
      role: "approver",
      department_id: operations.id,
    },
    {
      email: "admin@procurepro.test",
      full_name: "Femi Adeyemi",
      role: "super_admin",
      department_id: finance.id,
    },
  ];

  const createdUsers = {};
  for (const u of users) {
    const { data: existing } = await supabase.auth.admin.listUsers();
    const already = existing.users.find((x) => x.email === u.email);
    if (already) {
      console.log(`  ${u.email} already exists, skipping create`);
      createdUsers[u.role] = already;
      continue;
    }
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: SEED_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: u.full_name,
        role: u.role,
        department_id: u.department_id,
      },
    });
    if (error) throw error;
    createdUsers[u.role] = data.user;
    console.log(`  created ${u.email} (${u.role})`);
  }

  console.log("Seeding vendors...");
  const { error: vendorErr } = await supabase.from("vendors").upsert(
    [
      {
        name: "Delta Industrial Supplies Ltd",
        category: "Equipment & Tools",
        contact_email: "sales@deltaindustrial.example",
        contact_phone: "+234 801 234 5678",
        payment_terms: "Net 30",
        is_approved: true,
      },
      {
        name: "Naija Office Essentials",
        category: "Office Supplies",
        contact_email: "orders@naijaoffice.example",
        contact_phone: "+234 802 345 6789",
        payment_terms: "Net 15",
        is_approved: true,
      },
    ],
    { onConflict: "name" }
  );
  if (vendorErr) throw vendorErr;

  console.log("Seeding approval rules...");
  await supabase.from("approval_rules").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  const { error: ruleErr } = await supabase.from("approval_rules").insert([
    {
      department_id: operations.id,
      min_amount: 0,
      max_amount: 500000,
      approver_role: "approver",
      step_order: 1,
    },
    {
      department_id: null,
      min_amount: 500000,
      max_amount: null,
      approver_role: "finance_admin",
      step_order: 2,
    },
  ]);
  if (ruleErr) throw ruleErr;

  console.log("Seeding budget...");
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const { error: budgetErr } = await supabase.from("budgets").upsert(
    [
      {
        department_id: operations.id,
        category: "Office Supplies",
        period: "monthly",
        period_start: periodStart,
        period_end: periodEnd,
        allocated_amount: 500000,
      },
      {
        department_id: operations.id,
        category: "Equipment & Tools",
        period: "monthly",
        period_start: periodStart,
        period_end: periodEnd,
        allocated_amount: 2000000,
      },
    ],
    { onConflict: "department_id,category,period_start,period_end" }
  );
  if (budgetErr) throw budgetErr;

  console.log("\nDone. Sign in with any of:");
  for (const u of users) {
    console.log(`  ${u.email} / ${SEED_PASSWORD}  (${u.role})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
