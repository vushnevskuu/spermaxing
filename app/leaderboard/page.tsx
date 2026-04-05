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

const MOCK_ROWS = [
  { id: "1", nickname: "PacketLossLarry", wins: 42, streak: 5, rating: 1240, podiums: 18 },
  { id: "2", nickname: "NeonNarwhal", wins: 38, streak: 2, rating: 1190, podiums: 15 },
  { id: "3", nickname: "TurboTofu", wins: 31, streak: 0, rating: 1122, podiums: 11 },
];

const MOCK_RUSH_ROWS: VerticalRushRow[] = [
  { id: "1", nickname: "PacketLossLarry", bestM: 8420, runs: 24 },
  { id: "2", nickname: "NeonNarwhal", bestM: 7910, runs: 18 },
  { id: "3", nickname: "TurboTofu", bestM: 6540, runs: 31 },
];

export default async function LeaderboardPage() {
  let rows: {
    id: string;
    nickname: string;
    wins: number;
    streak: number;
    rating: number;
    podiums: number;
  }[] = MOCK_ROWS;

  let rushRows: VerticalRushRow[] = MOCK_RUSH_ROWS;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id,nickname,wins,streak,rating,podiums")
        .order("wins", { ascending: false })
        .limit(80);
      if (data?.length) {
        rows = data.map((r) => ({
          id: r.id,
          nickname: r.nickname,
          wins: r.wins,
          streak: r.streak,
          rating: r.rating,
          podiums: r.podiums,
        }));
      }

      const { data: bestData, error: rushErr } = await supabase
        .from("vertical_rush_best")
        .select("profile_id,best_distance_m,runs_played")
        .order("best_distance_m", { ascending: false })
        .limit(80);
      if (!rushErr && bestData?.length) {
        const ids = [...new Set(bestData.map((r) => r.profile_id))];
        const { data: profs } = await supabase.from("profiles").select("id,nickname").in("id", ids);
        const nm = new Map((profs ?? []).map((p) => [p.id, p.nickname]));
        rushRows = bestData.map((r) => ({
          id: r.profile_id,
          nickname: nm.get(r.profile_id) ?? "—",
          bestM: r.best_distance_m,
          runs: r.runs_played,
        }));
      }
    } catch {
      /* fallback mock */
    }
  }

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
              <LeaderboardTable rows={rows} />
              {!isSupabaseConfigured() ? (
                <p className="mt-3 text-xs text-amber-200/90">
                  Demo data shown — add Supabase keys in .env for a live table.
                </p>
              ) : null}
            </TabsContent>
            <TabsContent value="vertical">
              <p className="mb-3 text-xs text-muted-foreground">
                Best distance (meters) in{" "}
                <Link href="/rush" className="text-purple-300 underline underline-offset-2 hover:text-purple-200">
                  Arcade / Vertical rush
                </Link>
                . Apply migration <code className="rounded bg-white/10 px-1">vertical_rush_best</code> if the table is
                missing.
              </p>
              <VerticalRushLeaderboardTable rows={rushRows} />
              {!isSupabaseConfigured() ? (
                <p className="mt-3 text-xs text-amber-200/90">
                  Demo data shown — add Supabase keys and run migrations for live scores.
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
