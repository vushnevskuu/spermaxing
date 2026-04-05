import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/mock-mode";
import { rateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  distanceM: z.number().int().min(1).max(500_000),
});

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, mock: true, saved: false });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Session required" }, { status: 401 });
  }

  const rl = rateLimit(`vertical-rush:${user.id}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many submissions", retryAfterMs: rl.retryAfterMs },
      { status: 429 }
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { distanceM } = parsed.data;

  const { data: existing } = await supabase
    .from("vertical_rush_best")
    .select("best_distance_m, runs_played")
    .eq("profile_id", user.id)
    .maybeSingle();

  const prevBest = existing?.best_distance_m ?? 0;
  const nextBest = Math.max(prevBest, distanceM);
  const runs = (existing?.runs_played ?? 0) + 1;

  const { error } = await supabase.from("vertical_rush_best").upsert(
    {
      profile_id: user.id,
      best_distance_m: nextBest,
      runs_played: runs,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    bestDistanceM: nextBest,
    isNewBest: distanceM > prevBest,
  });
}
