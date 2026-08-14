const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5";

export interface ExtractedRequestFields {
  description: string;
  category: string;
  qty: number;
  est_unit_cost: number;
  mpn: string;
  oem_brand: string;
  urgency: "low" | "normal" | "high" | "critical";
  justification: string;
}

const EXTRACT_TOOL = {
  name: "extract_request_fields",
  description:
    "Extract purchase request fields from a vendor quote, invoice, or spec sheet. Only fill fields you can actually read from the document; leave a field as an empty string (or 0 for numbers) if it isn't present rather than guessing.",
  input_schema: {
    type: "object",
    properties: {
      description: { type: "string", description: "Item or service description, e.g. '5x Toyota Hilux replacement tyres, 265/65R17'" },
      category: { type: "string", description: "Short category, e.g. 'Equipment & Tools'" },
      qty: { type: "number", description: "Quantity as a plain number" },
      est_unit_cost: { type: "number", description: "Unit cost in Nigerian Naira (NGN), as a plain number, no currency symbol or thousands separators" },
      mpn: { type: "string", description: "Manufacturer part number, if present" },
      oem_brand: { type: "string", description: "OEM brand/manufacturer name, if present" },
      urgency: { type: "string", enum: ["low", "normal", "high", "critical"], description: "Best guess at urgency; default to 'normal' if the document gives no signal" },
      justification: { type: "string", description: "One short sentence on why this purchase is needed, if inferable from the document; otherwise empty" },
    },
    required: ["description", "category", "qty", "est_unit_cost", "mpn", "oem_brand", "urgency", "justification"],
  },
};

async function callExtractTool(content: unknown[]): Promise<ExtractedRequestFields> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set — AI extraction is not configured.");

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      tools: [EXTRACT_TOOL],
      tool_choice: { type: "tool", name: "extract_request_fields" },
      messages: [{ role: "user", content }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Anthropic API error (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const toolUse = data.content?.find((block: { type: string }) => block.type === "tool_use");
  if (!toolUse) throw new Error("Extraction did not return structured data — try being more specific.");

  return toolUse.input as ExtractedRequestFields;
}

export async function extractRequestFields(fileBuffer: Buffer, mimeType: string): Promise<ExtractedRequestFields> {
  const isPdf = mimeType === "application/pdf";
  const isImage = mimeType.startsWith("image/");
  if (!isPdf && !isImage) throw new Error("Unsupported file type — upload a PDF or an image (JPG/PNG).");

  const base64 = fileBuffer.toString("base64");

  return callExtractTool([
    {
      type: isPdf ? "document" : "image",
      source: { type: "base64", media_type: mimeType, data: base64 },
    },
    {
      type: "text",
      text: "Extract the purchase request fields from this document using the extract_request_fields tool.",
    },
  ]);
}

export async function extractRequestFieldsFromText(text: string): Promise<ExtractedRequestFields> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Type a description first.");
  if (trimmed.length > 4000) throw new Error("That's a lot of text — trim it to a paragraph or two.");

  return callExtractTool([
    {
      type: "text",
      text: `Extract the purchase request fields from this text using the extract_request_fields tool. The text may be an informal note, a forwarded email, or a WhatsApp-style message — infer sensible field values, and if quantity/cost aren't stated, leave them as 0 rather than guessing:\n\n"""\n${trimmed}\n"""`,
    },
  ]);
}
