import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import {
  VerticalRushLeaderboardTable,
  type VerticalRushRow,
} from "@/components/leaderboard/vertical-rush-leaderboard-table";

/** Всегда тянуть актуальные строки из Supabase, а не кэш билда. */
export const dynamic = "force-dynamic";

type GlobalRow = {
  id: string;
  nickname: string;
  wins: number;
  streak: number;
  rating: number;
  podiums: number;
};

export default async function LeaderboardPage() {
  let rows: GlobalRow[] = [];
  let rushRows: VerticalRushRow[] = [];
  let globalLoadFailed = false;
  let rushLoadFailed = false;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();

      const { data: profData, error: profErr } = await supabase
        .from("profiles")
        .select("id,nickname,wins,streak,rating,podiums")
        .order("wins", { ascending: false })
        .order("rating", { ascending: false })
        .limit(100);

      if (profErr) {
        globalLoadFailed = true;
      } else if (profData?.length) {
        rows = profData.map((r) => ({
          id: r.id,
          nickname: r.nickname?.trim() || "Player",
          wins: r.wins ?? 0,
          streak: r.streak ?? 0,
          rating: r.rating ?? 0,
          podiums: r.podiums ?? 0,
        }));
      }

      const { data: bestData, error: rushErr } = await supabase
        .from("vertical_rush_best")
        .select("profile_id,best_distance_m,runs_played")
        .order("best_distance_m", { ascending: false })
        .limit(100);

      if (rushErr) {
        rushLoadFailed = true;
      } else if (bestData?.length) {
        const ids = [...new Set(bestData.map((r) => r.profile_id))];
        const { data: nickRows, error: nickErr } = await supabase
          .from("profiles")
          .select("id,nickname")
          .in("id", ids);
        if (nickErr) {
          rushLoadFailed = true;
        } else {
          const nm = new Map((nickRows ?? []).map((p) => [p.id, p.nickname?.trim() || "Player"]));
          rushRows = bestData.map((r) => ({
            id: r.profile_id,
            nickname: nm.get(r.profile_id) ?? "Player",
            bestM: r.best_distance_m,
            runs: r.runs_played,
          }));
        }
      }
    } catch {
      globalLoadFailed = true;
      rushLoadFailed = true;
      rows = [];
      rushRows = [];
    }
  }

  const live = isSupabaseConfigured();

  return (
    <div className="mx-auto max-w-4xl py-10 pt-safe pb-safe px-safe">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black text-white">Leaderboard</h1>
        <Button variant="secondary" asChild>
          <Link href="/lobby">To lobby</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Standings</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="global">
            <TabsList className="h-auto flex-wrap gap-1">
              <TabsTrigger value="global">Global</TabsTrigger>
              <TabsTrigger value="vertical">Vertical rush</TabsTrigger>
              <TabsTrigger value="weekly">Weekly (MVP)</TabsTrigger>
            </TabsList>
            <TabsContent value="global">
              <p className="mb-3 text-xs text-muted-foreground">
                Race stats from player profiles (wins, podiums, rating). Only registered players appear.
              </p>
              <LeaderboardTable rows={rows} />
              {!live ? (
                <p className="mt-3 text-xs text-amber-200/90">
                  Live leaderboard needs <code className="rounded bg-white/10 px-1">NEXT_PUBLIC_SUPABASE_*</code> in{" "}
                  <code className="rounded bg-white/10 px-1">.env</code>.
                </p>
              ) : globalLoadFailed ? (
                <p className="mt-3 text-xs text-rose-300/90">Could not load standings. Check Supabase and RLS.</p>
              ) : rows.length === 0 ? (
                <p className="mt-3 text-xs text-muted-foreground">No profiles yet — sign up and enter the lobby.</p>
              ) : null}
            </TabsContent>
            <TabsContent value="vertical">
              <p className="mb-3 text-xs text-muted-foreground">
                Best distance (m) from logged-in runs in{" "}
                <Link href="/rush" className="text-amber-200/90 underline underline-offset-2 hover:text-amber-100">
                  Arcade / Vertical rush
                </Link>{" "}
                (egg climb). Scores sync when you finish a run with an account. Migration:{" "}
                <code className="rounded bg-white/10 px-1">vertical_rush_best</code>.
              </p>
              <VerticalRushLeaderboardTable rows={rushRows} />
              {!live ? (
                <p className="mt-3 text-xs text-amber-200/90">
                  Add Supabase keys and run migrations; play while signed in to save runs.
                </p>
              ) : rushLoadFailed ? (
                <p className="mt-3 text-xs text-rose-300/90">
                  Could not load vertical rush scores (missing table or RLS).
                </p>
              ) : rushRows.length === 0 ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  No saved runs yet — finish a vertical rush while logged in to appear here.
                </p>
              ) : null}
            </TabsContent>
            <TabsContent value="weekly">
              <p className="py-8 text-center text-sm text-muted-foreground">
                Weekly `leaderboard_snapshots` rollups ship in v2 (cron / edge). For now, use the
                global tab.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
