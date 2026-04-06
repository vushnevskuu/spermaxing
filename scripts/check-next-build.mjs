import fs from "fs";
import path from "path";

const buildId = path.join(process.cwd(), ".next", "BUILD_ID");
if (!fs.existsSync(buildId)) {
  console.error(`
  Нет production-сборки в .next.
  Сначала выполни:  npm run build
  Локально посмотреть прод:  npm run build && npm run start
  Разработка:  npm run dev
`);
  process.exit(1);
}
