const STRIP_TAGS = /<[^>]*>/g;

export function stripHtml(input: string): string {
  return input.replace(STRIP_TAGS, "");
}

export function sanitizePublicText(input: string, maxLen: number): string {
  const noTags = stripHtml(input);
  const trimmed = noTags.trim().slice(0, maxLen);
  return trimmed.replace(/\u0000/g, "");
}
