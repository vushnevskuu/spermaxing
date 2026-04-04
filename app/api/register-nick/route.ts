import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/mock-mode";
import { registerNickSchema } from "@/lib/validation";
import { sanitizePublicText } from "@/lib/sanitize";
import { containsProfanity } from "@/lib/profanity";

const DEFAULT_AVATAR = {
  avatar_name: "SpringBean",
  color_theme: "electric",
  tail_type: "ribbon",
  aura_effect: "pulse",
  headgear: "none",
  face_extra: "none",
  neck_wear: "none",
} as const;

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, mock: true });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = registerNickSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const nickname = sanitizePublicText(parsed.data.nickname, 20);
  if (containsProfanity(nickname)) {
    return NextResponse.json({ error: "Nickname failed moderation" }, { status: 422 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: "Session required" }, { status: 401 });
  }

  const { data: nickOwner } = await supabase
    .from("profiles")
    .select("id")
    .eq("nickname", nickname)
    .maybeSingle();
  if (nickOwner && nickOwner.id !== user.id) {
    return NextResponse.json({ error: "That nickname is taken" }, { status: 409 });
  }

  const { error: pErr } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      nickname,
      title: "Rookie",
      tagline: "Just spawned in.",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (pErr) {
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }

  const { error: aErr } = await supabase.from("avatars").upsert(
    {
      profile_id: user.id,
      ...DEFAULT_AVATAR,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id" }
  );

  if (aErr) {
    return NextResponse.json({ error: aErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
