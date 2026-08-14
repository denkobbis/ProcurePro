import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2c4f9e",
        }}
      >
        <svg width="112" height="112" viewBox="0 0 24 24" fill="none">
          <path
            d="M8 7h5.2a3.3 3.3 0 0 1 0 6.6H10v3.4H8V7Zm2 2v2.6h3.2a1.3 1.3 0 0 0 0-2.6H10Z"
            fill="white"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
