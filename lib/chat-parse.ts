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
