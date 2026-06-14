import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = "https://screenpost.io";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "ScreenPost — Your build, tweeted every hour",
  description:
    "ScreenPost is an always-on bot that watches what you're building and posts insightful tweets about it — automatically, every hour. Build in public on autopilot.",
  keywords: [
    "build in public",
    "indie hacker",
    "auto tweet",
    "twitter automation",
    "screenshot bot",
    "ScreenPost",
  ],
  authors: [{ name: "Andy Hafell", url: "https://github.com/andyhafell" }],
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: "ScreenPost — Your build, tweeted every hour",
    description:
      "An always-on bot that watches what you're building and posts insightful tweets about it — automatically, every hour.",
    siteName: "ScreenPost",
  },
  twitter: {
    card: "summary_large_image",
    title: "ScreenPost — Your build, tweeted every hour",
    description:
      "Build in public on autopilot. ScreenPost turns the work you're already doing into insightful tweets, every hour.",
    creator: "@andyhafell",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {/* Marks JS as available before paint so scroll-reveal can engage
            without hiding content for no-JS users. */}
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('js')",
          }}
        />
        {children}
      </body>
    </html>
  );
}
