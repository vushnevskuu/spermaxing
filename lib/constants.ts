export const LOBBY_ROOM_SLUG = "main";
export const EGG_ZONE = { cx: 0.5, cy: 0.08, rx: 0.12, ry: 0.08 };
export const RACE_DURATION_MS_MIN = 15000;
export const RACE_DURATION_MS_MAX = 25000;
export const CHAT_RATE_MS = 1500;
export const MAX_CHAT_LEN = 280;
/** Не показывать в лобби присутствие старше этого интервала (мс). */
export const PRESENCE_STALE_MS = 15 * 60 * 1000;
/** Сколько последних сообщений подгружать из БД при входе в лобби. */
export const LOBBY_CHAT_HISTORY_LIMIT = 150;
/** Как часто слать позицию в presence_rooms (мс); реже — меньше нагрузки на Realtime. */
export const PRESENCE_UPSERT_INTERVAL_MS = 400;
