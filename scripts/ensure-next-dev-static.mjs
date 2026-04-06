import fs from "fs";
import path from "path";

/**
 * Turbopack иногда пишет манифест в .next/static/development до mkdir —
 * при «смешанном» .next после production build это давало ENOENT и 500.
 * Создаём каталог заранее (идемпотентно).
 */
const dir = path.join(process.cwd(), ".next", "static", "development");
fs.mkdirSync(dir, { recursive: true });
