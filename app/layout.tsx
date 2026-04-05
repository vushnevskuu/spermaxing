import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono, Orbitron } from "next/font/google";
import "@/styles/globals.css";

const sans = Space_Grotesk({
  subsets: ["latin", "latin-ext"],
  variable: "--font-geist-sans",
});

const mono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-geist-mono",
});

const display = Orbitron({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "900"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  title: {
    default: "OVUM RUSH — Beta men's lobby chat, sperm maxing & micro-races",
    template: "%s | OVUM RUSH",
  },
  description:
    "Beta browser arcade: live lobby chat for men's health talk, sperm maxing discussion, and casual men's chat — plus cartoon swimmer races. Entertainment only; not medical advice.",
  keywords: [
    "OVUM RUSH",
    "beta game",
    "men's health chat",
    "sperm maxing",
    "men's community",
    "live lobby",
    "browser arcade",
    "micro-races",
  ],
  openGraph: {
    title: "OVUM RUSH — Beta men's lobby & live chat arcade",
    description:
      "Join the beta: lobby chat for men's wellness topics and sperm maxing discussion, plus short neon races. Not medical advice.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OVUM RUSH — Beta men's lobby chat & races",
    description:
      "Beta arcade with live chat for men's health and sperm maxing talk — not medical advice.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${display.variable}`}>
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
