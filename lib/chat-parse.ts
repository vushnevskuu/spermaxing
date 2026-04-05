/** Parse chat commands: `/w Name text` or `/ш Name text` (Cyrillic alias). */
export type ParsedChat =
  | { kind: "say"; text: string }
  | { kind: "whisper"; targetNick: string; text: string };

export function parseChatCommand(raw: string): ParsedChat {
  const s = raw.trim();
  const m = s.match(/^\/(?:w|ш|шепот|шёпот)\s+(\S+)\s+([\s\S]+)$/i);
  if (m) {
    return { kind: "whisper", targetNick: m[1], text: m[2].trim() };
  }
  return { kind: "say", text: s };
}

/**
 * While typing a whisper target (`/w partial`), returns `{ query }` for filtering players.
 * Returns `null` once the message body has started (anything after name + space + non-empty text).
 */
export function parseWhisperAutocompleteState(raw: string): null | { query: string } {
  const prefix = raw.match(/^\/(?:w|ш|шепот|шёпот)/i);
  if (!prefix) return null;
  const rest = raw.slice(prefix[0].length);
  const afterCmd = rest.replace(/^\s*/, "");
  if (afterCmd === "") return { query: "" };
  const m = afterCmd.match(/^(\S*)(?:\s+(.*))?$/);
  if (!m) return { query: "" };
  const token = m[1] ?? "";
  const afterToken = m[2];
  if (afterToken !== undefined && afterToken.length > 0) return null;
  return { query: token };
}
