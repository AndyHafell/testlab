import { ImageResponse } from "next/og";

export const alt = "ScreenPost — Your build, tweeted every hour";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#09090b",
          backgroundImage:
            "radial-gradient(800px 360px at 50% -10%, rgba(245,158,11,0.20), transparent)",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{ width: 26, height: 26, borderRadius: 7, background: "#f59e0b" }}
          />
          <span style={{ color: "#ffffff", fontSize: 30, fontWeight: 600 }}>
            ScreenPost
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              color: "#ffffff",
              fontSize: 78,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
            }}
          >
            Your build, tweeted
          </span>
          <span
            style={{
              color: "#fbbf24",
              fontSize: 78,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
            }}
          >
            every hour.
          </span>
          <span style={{ color: "#a1a1aa", fontSize: 30, marginTop: 28 }}>
            The always-on bot that posts insightful tweets about what you&rsquo;re
            building.
          </span>
        </div>

        <span style={{ color: "#71717a", fontSize: 24 }}>screenpost.io</span>
      </div>
    ),
    { ...size },
  );
}
