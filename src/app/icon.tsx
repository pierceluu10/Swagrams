import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111111",
          borderRadius: 90,
        }}
      >
        {/* Tile */}
        <div
          style={{
            width: 320,
            height: 320,
            borderRadius: 48,
            background: "linear-gradient(155deg, #e8d08a, #c9a84e)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: "rotate(-6deg)",
            boxShadow:
              "6px 8px 20px rgba(0,0,0,0.6), inset 0 2px 3px rgba(255,255,255,0.3)",
          }}
        >
          <span
            style={{
              fontSize: 220,
              fontWeight: 800,
              color: "#5c4a1e",
              fontFamily: "sans-serif",
              lineHeight: 1,
            }}
          >
            S
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
