import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";

const MOCK_ROWS = [
  { id: "1", nickname: "PacketLossLarry", wins: 42, streak: 5, rating: 1240, podiums: 18 },
  { id: "2", nickname: "NeonNarwhal", wins: 38, streak: 2, rating: 1190, podiums: 15 },
  { id: "3", nickname: "TurboTofu", wins: 31, streak: 0, rating: 1122, podiums: 11 },
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
    } catch {
      /* fallback mock */
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
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
            <TabsList>
              <TabsTrigger value="global">Global</TabsTrigger>
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
