/**
 * Canonical public site origin (no trailing slash).
 * Vercel sets VERCEL_URL without protocol when NEXT_PUBLIC_SITE_URL is unset.
 */
export function publicSiteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }
  return "https://example.com";
}
