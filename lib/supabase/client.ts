import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { isSupabaseConfigured } from "@/lib/mock-mode";

export function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
