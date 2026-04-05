/** Public lobby nicknames: Latin only (no Cyrillic), for consistent chat/commands. */
export const LOBBY_NICKNAME_MIN = 2;
export const LOBBY_NICKNAME_MAX = 20;
export const LOBBY_NICKNAME_PATTERN = /^[a-zA-Z0-9.\- ]+$/;

export function isCompliantLobbyNickname(n: string): boolean {
  const t = n.trim();
  return (
    t.length >= LOBBY_NICKNAME_MIN &&
    t.length <= LOBBY_NICKNAME_MAX &&
    LOBBY_NICKNAME_PATTERN.test(t)
  );
}

/** Legacy accounts (e.g. Cyrillic nick) may rename once to a compliant name in Wardrobe. */
export function nicknameRequiresLatinMigration(n: string): boolean {
  const t = n.trim();
  if (!t) return false;
  return !isCompliantLobbyNickname(t);
}
