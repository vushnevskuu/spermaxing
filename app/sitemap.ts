import type { MetadataRoute } from "next";
import { publicSiteOrigin } from "@/lib/site-url";

const paths = ["", "/enter", "/leaderboard", "/faq", "/rush", "/login", "/onboarding"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = publicSiteOrigin();
  const now = new Date();
  return paths.map((path) => ({
    url: `${base}${path || "/"}`,
    lastModified: now,
    changeFrequency: path === "" || path === "/faq" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/faq" ? 0.85 : 0.7,
  }));
}
