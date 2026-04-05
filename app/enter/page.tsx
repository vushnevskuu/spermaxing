"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/mock-mode";
import { nicknameSchema } from "@/lib/validation";
import { defaultStoredProfile, saveLocalProfile } from "@/lib/local-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function EnterPage() {
  const router = useRouter();
  const [nick, setNick] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const cloud = isSupabaseConfigured();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const parsed = nicknameSchema.safeParse(nick.trim());
    if (!parsed.success) {
      setErr(parsed.error.flatten().formErrors.join(", ") || "Check your nickname");
      return;
    }
    setLoading(true);
    try {
      if (cloud) {
        const supabase = createClient();
        const { data: sess } = await supabase.auth.getSession();
        if (!sess.session) {
          const { error: signErr } = await supabase.auth.signInAnonymously();
          if (signErr) throw signErr;
        }
        const res = await fetch("/api/register-nick", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nickname: parsed.data }),
        });
        if (!res.ok) {
          const j = (await res.json()) as { error?: unknown };
          let msg: string;
          if (res.status === 401) {
            msg =
              "Сессия не найдена. Обнови страницу и попробуй снова (или отключи блокировку куков для сайта).";
          } else if (res.status === 409) {
            msg =
              "Этот ник уже занят другим входом (другой браузер, инкогнито или после очистки данных сайта). Зайди с того же браузера, где уже регистрировался, или выбери другой ник.";
          } else if (typeof j.error === "string") {
            msg = j.error;
          } else if (j.error && typeof j.error === "object" && "formErrors" in j.error) {
            msg = "Проверь формат ника.";
          } else {
            msg = "Сервер отклонил ник. Попробуй ещё раз.";
          }
          throw new Error(msg);
        }
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) throw new Error("No session");
        saveLocalProfile(defaultStoredProfile(parsed.data, u.user.id));
      } else {
        saveLocalProfile(defaultStoredProfile(parsed.data));
      }
      try {
        sessionStorage.removeItem("ovum_rush_guest");
      } catch {
        /* ignore */
      }
      router.push("/lobby");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center py-10 pt-safe pb-safe px-safe">
      <Card className="border-2 border-amber-500/30 bg-card/95 shadow-[0_0_40px_rgba(255,200,100,0.12)]">
        <CardHeader>
          <CardTitle className="font-black">Pick a nickname</CardTitle>
          <CardDescription>
            We&apos;ll remember you on this device. Customize your look later in the wardrobe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            {err ? <p className="text-sm text-red-300">{err}</p> : null}
            <div>
              <Label htmlFor="nick">Public nickname</Label>
              <Input
                id="nick"
                value={nick}
                onChange={(e) => setNick(e.target.value)}
                placeholder="e.g. TurboSquish"
                autoComplete="username"
                maxLength={20}
                className="mt-1 font-semibold"
              />
            </div>
            <Button type="submit" className="w-full neon" size="lg" disabled={loading}>
              {loading ? "Entering…" : "Enter lobby"}
            </Button>
            <Button variant="ghost" className="w-full" asChild>
              <Link href="/onboarding">Full wardrobe</Link>
            </Button>
            <Button variant="ghost" className="w-full text-xs text-muted-foreground" asChild>
              <Link href="/">Back to home</Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
