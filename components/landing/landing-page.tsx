"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Single-viewport home: no scroll, chat-first explanation, primary CTA = enter lobby.
 */
export function LandingPage() {
  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-background text-foreground">
      <header className="shrink-0 border-b border-border/40 px-safe py-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="font-display truncate text-base font-bold tracking-tight sm:text-lg">OVUM RUSH</span>
            <Badge variant="secondary" className="shrink-0 text-[10px] sm:text-xs">
              Beta
            </Badge>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="sm" className="text-xs sm:text-sm" asChild>
              <Link href="/rush">Arcade</Link>
            </Button>
            <Button variant="ghost" size="sm" className="text-xs sm:text-sm" asChild>
              <Link href="/leaderboard">Leaderboard</Link>
            </Button>
          </div>
        </div>
      </header>

      <main
        className="flex min-h-0 flex-1 flex-col justify-center px-safe py-4 sm:py-6"
        aria-labelledby="hero-heading"
      >
        <div className="mx-auto w-full max-w-lg">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-amber-200/90 sm:text-xs">
            Open beta — may change
          </p>
          <h1
            id="hero-heading"
            className="font-display text-balance text-xl font-bold leading-tight tracking-tight sm:text-3xl md:text-4xl"
          >
            A live lobby for men&apos;s chat
          </h1>
          <p className="mt-2 text-pretty text-xs leading-snug text-muted-foreground sm:mt-3 sm:text-sm">
            <strong className="font-medium text-foreground">The lobby</strong> is one realtime room: you see who&apos;s
            there, <strong className="font-medium text-foreground">chat</strong> (public + whispers), move a cartoon
            swimmer, and <strong className="font-medium text-foreground">optionally</strong> queue for a short neon race
            — chat first, races are extra.
          </p>
          <ul className="mt-3 space-y-1 text-[11px] leading-snug text-muted-foreground sm:mt-4 sm:space-y-1.5 sm:text-sm">
            <li className="flex gap-1.5 sm:gap-2">
              <span className="shrink-0 text-foreground" aria-hidden>
                ·
              </span>
              <span>Wardrobe &amp; profile card after you enter; leaderboard linked above.</span>
            </li>
            <li className="flex gap-1.5 sm:gap-2">
              <span className="shrink-0 text-foreground" aria-hidden>
                ·
              </span>
              <span>Men&apos;s health discussion welcome — parody vibe, not a simulator or clinic.</span>
            </li>
          </ul>
          <p className="mt-3 text-[10px] leading-snug text-muted-foreground sm:text-xs">
            <strong className="text-foreground">18+</strong>. Entertainment only — not medical advice.
          </p>
          <div className="mt-4 flex flex-col gap-1.5 sm:mt-5 sm:gap-2">
            <Button asChild size="lg" className="w-full gap-2 touch-manipulation sm:w-auto sm:min-w-[200px]">
              <Link href="/enter">
                Enter lobby <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <p className="text-[10px] text-muted-foreground sm:text-xs">Next: pick a nickname (saved on this device).</p>
          </div>
        </div>
      </main>

      <footer className="shrink-0 border-t border-border/40 px-safe py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] text-[10px] leading-tight text-muted-foreground">
        <p className="mx-auto max-w-lg text-center">Beta chat lobby · races optional · not clinical care</p>
      </footer>
    </div>
  );
}
