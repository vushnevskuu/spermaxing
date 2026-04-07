import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  MENS_HEALTH_FAQ_DISCLAIMER,
  MENS_HEALTH_FAQ_ITEMS,
  type MensHealthFaqItem,
} from "@/lib/mens-health-faq";

function FaqEntry({ item }: { item: MensHealthFaqItem }) {
  return (
    <details className="group border-b border-border py-2 last:border-b-0">
      <summary className="cursor-pointer list-none font-medium text-foreground outline-none marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-start justify-between gap-2">
          <span>{item.question}</span>
          <span className="shrink-0 text-muted-foreground transition group-open:rotate-180" aria-hidden>
            ▼
          </span>
        </span>
      </summary>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">
        <p>{item.answer}</p>
        {item.source ? (
          <p className="text-xs">
            <span className="text-muted-foreground">Source: </span>
            <a
              href={item.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-200/90 underline underline-offset-2 hover:text-amber-100"
            >
              {item.source.label}
            </a>
          </p>
        ) : null}
      </div>
    </details>
  );
}

type MensHealthFaqSectionProps = {
  /** Show only first N items; link to full FAQ page. */
  previewCount?: number;
  className?: string;
  heading?: string;
};

/**
 * Accordion FAQ for men’s health / fertility discussion context (not medical advice).
 */
export function MensHealthFaqSection({
  previewCount,
  className,
  heading = "Men’s health & fertility — discussion FAQ",
}: MensHealthFaqSectionProps) {
  const items: MensHealthFaqItem[] =
    previewCount !== undefined ? MENS_HEALTH_FAQ_ITEMS.slice(0, previewCount) : MENS_HEALTH_FAQ_ITEMS;
  const hasMore = previewCount !== undefined && previewCount < MENS_HEALTH_FAQ_ITEMS.length;

  return (
    <section
      className={cn("rounded-lg border border-border bg-card/40 px-3 py-3 sm:px-4", className)}
      aria-labelledby="mens-faq-heading"
    >
      <h2 id="mens-faq-heading" className="font-display text-sm font-semibold text-foreground sm:text-base">
        {heading}
      </h2>
      <p className="mt-2 text-[11px] leading-snug text-muted-foreground sm:text-xs">{MENS_HEALTH_FAQ_DISCLAIMER}</p>
      <div className="mt-3">
        {items.map((item) => (
          <FaqEntry key={item.id} item={item} />
        ))}
      </div>
      {hasMore ? (
        <p className="mt-3 text-center text-xs">
          <Link href="/faq" className="text-amber-200/90 underline underline-offset-2 hover:text-amber-100">
            All {MENS_HEALTH_FAQ_ITEMS.length} questions →
          </Link>
        </p>
      ) : null}
    </section>
  );
}
