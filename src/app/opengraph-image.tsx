import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #172750 0%, #0e1830 60%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#2c4f9e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
              <path
                d="M8 7h5.2a3.3 3.3 0 0 1 0 6.6H10v3.4H8V7Zm2 2v2.6h3.2a1.3 1.3 0 0 0 0-2.6H10Z"
                fill="white"
              />
            </svg>
          </div>
          <span style={{ fontSize: 34, fontWeight: 600, color: "white" }}>ProcurePro</span>
        </div>

        <div style={{ display: "flex", marginTop: 56 }}>
          <span
            style={{
              fontSize: 56,
              fontWeight: 600,
              color: "white",
              lineHeight: 1.15,
              maxWidth: 900,
            }}
          >
            Procurement control, without the SAP-sized budget.
          </span>
        </div>

        <div style={{ display: "flex", marginTop: 28 }}>
          <span style={{ fontSize: 26, color: "#8cb0e4", maxWidth: 780 }}>
            Approvals, budgets, and vendor compliance built for oil &amp; gas and heavy-industry teams.
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
