// One-off setup script: creates the ProcurePro subscription plan on Paystack
// and prints its plan_code. Run once (per Paystack account/mode), then paste
// the printed code into PAYSTACK_PLAN_CODE in .env.local.
//
// Usage: node --env-file=.env.local scripts/create-paystack-plan.mjs

const secretKey = process.env.PAYSTACK_SECRET_KEY;
if (!secretKey) {
  console.error("Missing PAYSTACK_SECRET_KEY. Fill in .env.local first.");
  process.exit(1);
}

const PLAN_NAME = "ProcurePro Standard";
const AMOUNT_NAIRA = 25000;

async function main() {
  const res = await fetch("https://api.paystack.co/plan", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: PLAN_NAME,
      amount: AMOUNT_NAIRA * 100, // kobo
      interval: "monthly",
      currency: "NGN",
    }),
  });
  const body = await res.json();
  if (!res.ok || body.status === false) {
    throw new Error(body.message || `Paystack request failed (${res.status})`);
  }

  console.log(`Created plan "${PLAN_NAME}" — ₦${AMOUNT_NAIRA.toLocaleString()}/month`);
  console.log(`plan_code: ${body.data.plan_code}`);
  console.log("\nAdd this to .env.local:");
  console.log(`PAYSTACK_PLAN_CODE=${body.data.plan_code}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
