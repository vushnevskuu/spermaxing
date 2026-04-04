import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/mock-mode";
import { onboardingSchema } from "@/lib/validation";
import { sanitizePublicText } from "@/lib/sanitize";
import { containsProfanity, maskProfanity } from "@/lib/profanity";
import { computeLoadoutStats } from "@/lib/avatar-stats";

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

  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const v = parsed.data;
  const nickname = sanitizePublicText(v.nickname, 20);
  const title = sanitizePublicText(v.title, 32);
  const tagline = sanitizePublicText(v.tagline, 80);
  const avatarName = sanitizePublicText(v.avatarName, 24);

  if (containsProfanity(nickname) || containsProfanity(title) || containsProfanity(tagline)) {
    return NextResponse.json({ error: "Nickname or title failed moderation." }, { status: 422 });
  }

  const stats = computeLoadoutStats({
    avatarName,
    colorTheme: v.colorTheme,
    tailType: v.tailType,
    auraEffect: v.auraEffect,
    headgear: v.headgear,
    faceExtra: v.faceExtra,
    neckWear: v.neckWear,
  });

  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: "Session required" }, { status: 401 });
  }

  const { error: pErr } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        nickname,
        title: maskProfanity(title),
        tagline: maskProfanity(tagline),
        ovr: stats.ovr,
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
      avatar_name: avatarName,
      color_theme: v.colorTheme,
      tail_type: v.tailType,
      aura_effect: v.auraEffect,
      headgear: v.headgear,
      face_extra: v.faceExtra,
      neck_wear: v.neckWear,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id" }
  );

  if (aErr) {
    return NextResponse.json({ error: aErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
