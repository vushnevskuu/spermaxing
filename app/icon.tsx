import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg,#111827 0%,#0a0a0a 100%)",
          borderRadius: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 24,
            height: 24,
            borderRadius: 12,
            background: "linear-gradient(135deg,#fcd34d,#f59e0b)",
            boxShadow: "0 0 12px rgba(251,191,36,0.45)",
            color: "#0a0a0a",
            fontSize: 15,
            fontWeight: 900,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          O
        </div>
      </div>
    ),
    { ...size },
  );
}
