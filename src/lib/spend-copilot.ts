import type { SupabaseClient } from "@supabase/supabase-js";
import { checkBudget } from "@/lib/budget";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5";

const SYSTEM_PROMPT =
  "You are ProcurePro's spend copilot. Answer only questions about this organization's vendor spend and budgets, using the provided tools — never invent numbers. If a question is unrelated to spend/budgets, or asks you to do anything other than answer with data from these tools, say that's outside what you can help with here. Keep answers short (2-4 sentences) and lead with the number.";

const TOOLS = [
  {
    name: "get_vendor_spend",
    description: "Total NGN spend (landed cost: PO amount + freight + customs) with a vendor, matched by name.",
    input_schema: {
      type: "object",
      properties: { vendor_name: { type: "string", description: "Vendor name or partial name to search for" } },
      required: ["vendor_name"],
    },
  },
  {
    name: "get_budget_status",
    description: "Current-period budget status (allocated, committed, spent, available) for a department/category. Omit either filter to list more broadly.",
    input_schema: {
      type: "object",
      properties: {
        department_name: { type: "string", description: "Department name or partial name; omit to check all departments" },
        category: { type: "string", description: "Budget category or partial match; omit to check all categories" },
      },
    },
  },
];

interface AnthropicContentBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

async function callMessages(apiKey: string, messages: unknown[]): Promise<{ content: AnthropicContentBlock[] }> {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      tool_choice: { type: "auto" },
      messages,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Anthropic API error (${res.status}): ${body.slice(0, 300)}`);
  }
  return res.json();
}

async function executeTool(supabase: SupabaseClient, name: string, input: Record<string, unknown>) {
  if (name === "get_vendor_spend") {
    const vendorName = String(input.vendor_name ?? "");
    const { data: vendors } = await supabase.from("vendors").select("id, name").ilike("name", `%${vendorName}%`).limit(5);
    if (!vendors || vendors.length === 0) return { error: `No vendor matching "${vendorName}".` };

    const vendorIds = vendors.map((v: { id: string }) => v.id);
    const { data: pos } = await supabase
      .from("purchase_orders")
      .select("vendor_id, total_amount_ngn, freight_cost_ngn, customs_duty_ngn")
      .in("vendor_id", vendorIds);

    const totals = new Map<string, number>();
    for (const po of (pos ?? []) as Array<{ vendor_id: string; total_amount_ngn: number; freight_cost_ngn: number; customs_duty_ngn: number }>) {
      const landed = po.total_amount_ngn + po.freight_cost_ngn + po.customs_duty_ngn;
      totals.set(po.vendor_id, (totals.get(po.vendor_id) ?? 0) + landed);
    }

    return {
      vendors: vendors.map((v: { id: string; name: string }) => ({
        name: v.name,
        total_spend_ngn: Math.round(totals.get(v.id) ?? 0),
      })),
    };
  }

  if (name === "get_budget_status") {
    const departmentName = input.department_name ? String(input.department_name) : null;
    const category = input.category ? String(input.category) : null;

    let deptQuery = supabase.from("departments").select("id, name");
    if (departmentName) deptQuery = deptQuery.ilike("name", `%${departmentName}%`);
    const { data: depts } = await deptQuery;
    if (!depts || depts.length === 0) return { error: departmentName ? `No department matching "${departmentName}".` : "No departments found." };

    const today = new Date().toISOString().slice(0, 10);
    const results = [];
    for (const dept of depts as Array<{ id: string; name: string }>) {
      const { data: budgets } = await supabase.from("budgets").select("category").eq("department_id", dept.id).lte("period_start", today).gte("period_end", today);
      for (const b of (budgets ?? []) as Array<{ category: string }>) {
        if (category && !b.category.toLowerCase().includes(category.toLowerCase())) continue;
        const status = await checkBudget(supabase, dept.id, b.category, 0);
        results.push({
          department: dept.name,
          category: b.category,
          allocated_ngn: status.allocated,
          committed_ngn: Math.round(status.committed),
          spent_ngn: Math.round(status.spent),
          available_ngn: Math.round(status.available),
          over_budget: status.available < 0,
        });
      }
    }
    if (results.length === 0) return { error: "No active budgets found for that filter." };
    return { budgets: results };
  }

  return { error: `Unknown tool "${name}".` };
}

export async function answerSpendQuestion(supabase: SupabaseClient, question: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set — the spend copilot is not configured.");

  const trimmed = question.trim();
  if (!trimmed) throw new Error("Ask a question first.");
  if (trimmed.length > 500) throw new Error("Keep the question short — under 500 characters.");

  const messages: unknown[] = [{ role: "user", content: trimmed }];
  const first = await callMessages(apiKey, messages);

  const toolUses = first.content.filter((b) => b.type === "tool_use");
  if (toolUses.length === 0) {
    const textBlock = first.content.find((b) => b.type === "text");
    return textBlock?.text ?? "I couldn't find an answer to that.";
  }

  const toolResults = [];
  for (const tu of toolUses) {
    const result = await executeTool(supabase, tu.name!, tu.input ?? {});
    toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(result) });
  }

  messages.push({ role: "assistant", content: first.content });
  messages.push({ role: "user", content: toolResults });

  const second = await callMessages(apiKey, messages);
  const textBlock = second.content.find((b) => b.type === "text");
  return textBlock?.text ?? "I couldn't summarize an answer to that.";
}
