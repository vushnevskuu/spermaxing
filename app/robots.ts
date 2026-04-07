import type { MetadataRoute } from "next";
import { publicSiteOrigin } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const base = publicSiteOrigin();
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${base}/sitemap.xml`,
  };
}
