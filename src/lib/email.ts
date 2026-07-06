// Thin wrapper around Resend's REST API (no SDK dependency needed for one endpoint).
// No-ops quietly if RESEND_API_KEY isn't set, so email is optional infrastructure —
// the app's core workflow never depends on it succeeding.
export async function sendEmail(to: string[], subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const recipients = to.filter(Boolean);
  if (!apiKey || recipients.length === 0) return;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "ProcurePro <onboarding@resend.dev>",
        to: recipients,
        subject,
        html,
      }),
    });
    if (!res.ok) {
      console.error("Resend email failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("Resend email request errored:", err);
  }
}
