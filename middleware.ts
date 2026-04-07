import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /* Skip SEO / static verification so crawlers never hit Supabase session refresh. */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|google[0-9a-z]+\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
