import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/mock-mode";
import { chatSendSchema } from "@/lib/validation";
import { sanitizePublicText } from "@/lib/sanitize";
import { maskProfanity, containsProfanity } from "@/lib/profanity";
import { rateLimit } from "@/lib/rate-limit";
import { LOBBY_ROOM_SLUG, MAX_CHAT_LEN } from "@/lib/constants";

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, mock: true });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Session required" }, { status: 401 });
  }

  const rl = rateLimit(`chat:${user.id}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many messages", retryAfterMs: rl.retryAfterMs },
      { status: 429 }
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = chatSendSchema.safeParse(
    typeof raw === "object" && raw !== null ? raw : { body: raw }
  );
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let text = sanitizePublicText(parsed.data.body, MAX_CHAT_LEN);
  if (containsProfanity(text)) {
    text = maskProfanity(text);
  }
  if (!text) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

  const recipient = parsed.data.recipientProfileId ?? null;

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      room_slug: LOBBY_ROOM_SLUG,
      profile_id: user.id,
      body: text,
      recipient_profile_id: recipient,
    })
    .select("id, created_at, recipient_profile_id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: data });
}
