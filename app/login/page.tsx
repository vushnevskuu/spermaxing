"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/mock-mode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const configured = isSupabaseConfigured();

  async function anon() {
    setLoading(true);
    setErr(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      router.push("/onboarding");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  function guestMock() {
    try {
      sessionStorage.setItem("ovum_rush_guest", "1");
    } catch {
      /* ignore */
    }
    router.push("/onboarding");
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sign in to OVUM RUSH</CardTitle>
          <CardDescription>
            Lightweight anonymous session via Supabase, or guest mode without cloud (data stays
            local).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {err ? (
            <p className="rounded-sm border-2 border-red-500/50 bg-red-950/40 p-3 text-sm text-red-200">
              {err}
            </p>
          ) : null}
          {configured ? (
            <Button className="w-full neon" disabled={loading} onClick={anon}>
              {loading ? "Signing in…" : "Anonymous sign-in (Supabase)"}
            </Button>
          ) : (
            <p className="text-sm text-amber-200/90">
              Supabase env vars are missing — guest mode only.
            </p>
          )}
          <Button variant="secondary" className="w-full" disabled={loading} onClick={guestMock}>
            Guest (local only, no account)
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/enter">Quick enter (nickname only)</Link>
          </Button>
          <Button variant="ghost" className="w-full" asChild>
            <Link href="/">Back to landing</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
