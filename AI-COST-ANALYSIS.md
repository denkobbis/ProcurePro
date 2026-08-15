# AI feature cost per company

Cost of running ProcurePro's shipped AI features, per organization per month,
against Anthropic's published API pricing. This is Anthropic API spend
only — separate from what a customer pays ProcurePro (₦25,000/month flat).

Pricing confirmed 2026-08-15 from [platform.claude.com/docs/en/about-claude/pricing](https://platform.claude.com/docs/en/about-claude/pricing).
Model used: **Claude Sonnet 5**.

| | Input | Output |
|---|---|---|
| Base rate | $2 / MTok | $10 / MTok |
| Tool-use system-prompt overhead | +354–474 tokens/call | — |

All ProcurePro AI features use forced or auto tool-calling for structured
output, so every call carries that overhead — already included in the
per-call estimates below. No prompt caching is used anywhere in the current
implementation (each call is a one-off, not a repeated-context conversation),
so there's no caching discount to apply, and no batch API either (all calls
are synchronous, user-facing).

## Per-call cost, by feature

| Feature | Typical input | Typical output | Cost/call |
|---|---|---|---|
| Document extraction (PDF/image quote or invoice) | ~3,000 tokens (1-2 page doc + tool schema) | ~200 tokens (structured fields) | **~$0.008** |
| Freeform-text intake ("need 50 gate valves...") | ~1,500 tokens (short text + tool schema) | ~200 tokens | **~$0.005** |
| Spend copilot (1 question, 2 API calls: tool-pick + final answer) | ~2,000 tokens combined | ~250 tokens combined | **~$0.006** |
| Bid/quote comparison | — | — | **$0 — pure arithmetic, no LLM call** |
| Vendor scorecard | — | — | **$0 — SQL aggregation only** |
| Approval bottleneck flag | — | — | **$0 — statistics only** |

Three of the six shipped AI features cost nothing per use — they're
deterministic computation over data ProcurePro already has, not LLM calls
(see [AI-ROADMAP.md](AI-ROADMAP.md) for why: a model can only add
hallucination risk to a sum and a min(), not value).

## Monthly cost per company, by usage tier

Usage volume is a genuine unknown until real customers generate real data —
these tiers are assumptions, not measurements, so treat them as a planning
range, not a forecast.

| Tier | Extractions/mo | Freeform intakes/mo | Copilot questions/mo | **Monthly Anthropic cost** |
|---|---|---|---|---|
| **Light** (small team, occasional use) | 20 | 10 | 30 | **~$0.39** |
| **Medium** (active team, daily use) | 100 | 50 | 150 | **~$1.95** |
| **Heavy** (large team, power users) | 500 | 200 | 600 | **~$8.60** |

Calculation for Medium: (100 × $0.008) + (50 × $0.005) + (150 × $0.006) =
$0.80 + $0.25 + $0.90 = **$1.95**.

## What this means against the ₦25,000/month plan

At Naira/USD rates in the ₦1,500–1,600 range (check current rate — this
report doesn't attempt to track FX live), ₦25,000/month is roughly $15–17.
Even the Heavy tier's ~$8.60/month in Anthropic spend leaves comfortable
margin under a single customer's subscription revenue. AI costs are not a
meaningful threat to unit economics at any realistic usage volume for a
single-org SaaS plan — the risk profile that matters here is a small number
of orgs radically over-using the copilot or extraction features (e.g.
scripted/automated abuse), not normal team usage.

## Cost-control notes for later, if usage grows

- **No caching yet**: if the spend copilot's tool definitions/system prompt
  were cached (they're static across calls), the first-call overhead could
  drop by up to 90% on repeat questions within a cache window. Not worth
  the added complexity at current volumes.
- **No per-org rate limiting yet**: nothing currently caps how many
  extraction/copilot calls one organization can make per day. Worth adding
  if a "heavy" org turns out to mean something far outside these tiers.
- **Batch API** (50% off) doesn't apply — every current AI feature is
  synchronous and user-facing, not a background job.
