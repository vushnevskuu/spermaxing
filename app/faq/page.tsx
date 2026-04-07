import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MensHealthFaqSection } from "@/components/marketing/mens-health-faq";
import { MENS_HEALTH_FAQ_ITEMS, faqJsonLdMainEntity } from "@/lib/mens-health-faq";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

export const metadata: Metadata = {
  title: "Men’s health & fertility FAQ — discussion topics",
  description:
    "General education on male fertility and “spermmaxxing” topics people discuss in chat: lifestyle, semen analysis, heat, supplements, when to see a doctor. Not medical advice.",
  keywords: [
    "spermmaxxing FAQ",
    "male fertility FAQ",
    "semen analysis",
    "men's health chat",
    "sperm quality discussion",
    "OVUM RUSH",
  ],
  alternates: siteUrl ? { canonical: `${siteUrl}/faq` } : undefined,
  openGraph: {
    title: "Men’s health & fertility FAQ | OVUM RUSH",
    description:
      "Educational FAQ for community discussion — not a substitute for professional medical care.",
    type: "website",
    url: siteUrl ? `${siteUrl}/faq` : undefined,
  },
};

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqJsonLdMainEntity(MENS_HEALTH_FAQ_ITEMS),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mx-auto max-w-3xl py-10 pt-safe pb-safe px-safe">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-200/90">OVUM RUSH</p>
            <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Discussion FAQ</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Topics that often come up around men&apos;s wellness and fertility online. Use this to learn vocabulary
              and questions to ask a doctor — not to self-diagnose.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" asChild>
              <Link href="/leaderboard">Leaderboard</Link>
            </Button>
            <Button asChild>
              <Link href="/enter">Enter lobby</Link>
            </Button>
          </div>
        </div>
        <MensHealthFaqSection />
        <p className="mt-8 text-center text-xs text-muted-foreground">
          <Link href="/" className="text-foreground underline-offset-4 hover:underline">
            Home
          </Link>
          {" · "}
          <Link href="/lobby" className="text-foreground underline-offset-4 hover:underline">
            Lobby
          </Link>
        </p>
      </div>
    </>
  );
}
