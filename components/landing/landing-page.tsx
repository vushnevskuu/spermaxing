"use client";

import Link from "next/link";
import { ArrowRight, MessageCircle, Sparkles, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const steps = [
  {
    t: "How it works",
    d: "Drop into the lobby, move your cartoon swimmer, and enter the top zone to join the race queue.",
    icon: Users,
  },
  {
    t: "Customize",
    d: "Tail, aura, palette, title — no photo uploads in this beta.",
    icon: Sparkles,
  },
  {
    t: "Lobby chat",
    d: "Public chat and whispers — a space to hang out, discuss sperm maxing and men's health topics, or just shoot the breeze. Reports and filters are on.",
    icon: MessageCircle,
  },
  {
    t: "Micro-races",
    d: "Short 15–25 second runs, boosts, podiums, and leaderboard stats.",
    icon: Trophy,
  },
];

export function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="font-display text-lg font-bold tracking-tight text-foreground">
            OVUM RUSH
          </span>
          <Badge variant="secondary">Beta</Badge>
          <Badge variant="hot">Arcade</Badge>
        </div>
        <nav className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/community-rules">Rules</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/leaderboard">Leaderboard</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/enter">Enter lobby</Link>
          </Button>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-16">
        <section className="pt-4" aria-labelledby="hero-heading">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-amber-200/90">
            Open beta — features and balance may change
          </p>
          <h1
            id="hero-heading"
            className="font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl"
          >
            Men&apos;s lobby chat
            <br />
            <span className="text-muted-foreground">and neon micro-races.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
            <strong className="font-medium text-foreground">OVUM RUSH</strong> is a playful browser arcade
            in <strong className="font-medium text-foreground">beta</strong>. The live lobby doubles as a
            hangout: talk <strong className="font-medium text-foreground">men&apos;s health</strong>, share
            ideas around <strong className="font-medium text-foreground">sperm maxing</strong>, or keep it
            to a light <strong className="font-medium text-foreground">men&apos;s chat</strong> — then queue up
            for short cartoon swimmer races. Parody sports vibe, not a simulator.
          </p>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Entertainment and community discussion only. This is{" "}
            <strong className="text-foreground">not medical advice</strong> and not a substitute for a
            qualified clinician.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="gap-2">
              <Link href="/enter">
                Enter the lobby <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/leaderboard">Leaderboard</Link>
            </Button>
          </div>
        </section>

        <section className="mt-14" aria-labelledby="patch-notes-heading">
          <Card>
            <CardHeader>
              <CardTitle
                id="patch-notes-heading"
                className="flex items-center gap-2 text-base font-semibold"
              >
                <Sparkles className="h-4 w-4 text-muted-foreground" aria-hidden />
                Beta notes (v0.1)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Realtime lobby and chat (Supabase).</p>
              <p>Matchmaking queue in the top zone.</p>
              <p>Keyboard or tap micro-races.</p>
              <p>Player card and wardrobe basics.</p>
            </CardContent>
          </Card>
        </section>

        <section className="mt-14 space-y-8 border-t border-border pt-14" aria-labelledby="features-heading">
          <h2 id="features-heading" className="sr-only">
            Features
          </h2>
          {steps.map((x) => (
            <div key={x.t} className="flex gap-4">
              <x.icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              <div>
                <h3 className="font-medium text-foreground">{x.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{x.d}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-16 border-t border-border pt-14 text-center" aria-labelledby="leaderboard-heading">
          <h2 id="leaderboard-heading" className="font-display text-xl font-semibold text-foreground">
            Leaderboards
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Wins, podiums, and nicknames — climb the global table during beta.
          </p>
          <Button className="mt-6" variant="secondary" asChild>
            <Link href="/leaderboard">View leaderboard</Link>
          </Button>
        </section>
      </main>

      <footer className="border-t border-border px-4 py-8 text-center text-xs text-muted-foreground">
        <p className="mx-auto max-w-lg">
          OVUM RUSH is a <strong className="text-foreground">beta</strong> entertainment product. Not
          medical advice. Chat is for discussion, not diagnosis or treatment.
        </p>
        <p className="mt-3">
          <Link href="/community-rules" className="text-foreground underline-offset-4 hover:underline">
            Community rules
          </Link>
        </p>
      </footer>
    </div>
  );
}
