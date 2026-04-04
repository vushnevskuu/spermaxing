"use client";

import Link from "next/link";
import { ArrowRight, MessageCircle, Sparkles, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const steps = [
  {
    t: "How it works",
    d: "Join the lobby, move your swimmer, enter the zone at the top to join the race queue.",
    icon: Users,
  },
  {
    t: "Customize",
    d: "Tail, aura, palette, title — no photo uploads.",
    icon: Sparkles,
  },
  {
    t: "Chat",
    d: "Lobby chat and whispers. Reports and filters available.",
    icon: MessageCircle,
  },
  {
    t: "Races",
    d: "Short runs, boost, podium, points on the board.",
    icon: Trophy,
  },
];

export function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="font-display text-lg font-bold tracking-tight text-foreground">
            OVUM RUSH
          </span>
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
        <section className="pt-4">
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
            Short races.
            <br />
            <span className="text-muted-foreground">Live lobby.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
            Cartoon swimmer, chat, queue zone, 15–25 second races. Parody sports vibe — not a sim.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="gap-2">
              <Link href="/enter">
                To the lobby <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/leaderboard">Leaderboard</Link>
            </Button>
          </div>
        </section>

        <section className="mt-14">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                Patch notes v0.1
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Realtime lobby and chat (Supabase).</p>
              <p>Matchmaking queue at the top zone.</p>
              <p>Races with keys or taps.</p>
              <p>Player card export.</p>
            </CardContent>
          </Card>
        </section>

        <section className="mt-14 space-y-8 border-t border-border pt-14">
          {steps.map((x) => (
            <div key={x.t} className="flex gap-4">
              <x.icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              <div>
                <h2 className="font-medium text-foreground">{x.t}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{x.d}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-16 border-t border-border pt-14 text-center">
          <h2 className="font-display text-xl font-semibold text-foreground">Leaderboards</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Wins, podiums, search by nickname.
          </p>
          <Button className="mt-6" variant="secondary" asChild>
            <Link href="/leaderboard">View table</Link>
          </Button>
        </section>
      </main>

      <footer className="border-t border-border px-4 py-8 text-center text-xs text-muted-foreground">
        <p className="mx-auto max-w-lg">
          OVUM RUSH is entertainment only. Not medical advice. 18+.
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
