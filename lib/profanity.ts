/** Minimal MVP word list — extend server-side for production. */
const BLOCKED = new Set([
  "fuck",
  "shit",
  "bitch",
  "nazi",
  "slur",
  "porn",
  "sex",
  "rape",
  "kill",
  "nigger",
  "retard",
]);

export function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase().replace(/[^a-zа-яё0-9\s]/gi, " ");
  const tokens = lower.split(/\s+/).filter(Boolean);
  for (const t of tokens) {
    if (BLOCKED.has(t)) return true;
    for (const b of BLOCKED) {
      if (t.includes(b) || b.includes(t)) return true;
    }
  }
  return false;
}

export function maskProfanity(text: string): string {
  if (!containsProfanity(text)) return text;
  return "[filtered]";
}
