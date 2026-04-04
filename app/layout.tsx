import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono, Orbitron } from "next/font/google";
import "@/styles/globals.css";
import { AgeWarningBanner } from "@/components/age-warning-banner";

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

export const metadata: Metadata = {
  title: "OVUM RUSH — neon lobby & micro-races",
  description:
    "Meme arcade: cartoon swimmer, live chat, zone queue, short races. 18+ entertainment only.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${display.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <AgeWarningBanner />
        {children}
      </body>
    </html>
  );
}
