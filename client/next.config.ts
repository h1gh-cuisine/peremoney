import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev и production build не должны перезаписывать один Client Manifest.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  outputFileTracingRoot: __dirname,
  experimental: {
    // Router Cache Next.js держал уже посещённые страницы "свежими" до 30 с и
    // не перемонтировал их при возврате — useEffect с загрузкой данных не
    // срабатывал повторно, и таблицы (Источники, Лиды, Контакты и т.д.)
    // показывали устаревшие данные после правок на других страницах.
    // staleTimes: 0 заставляет каждый переход между разделами кабинета
    // запрашивать данные заново.
    staleTimes: { dynamic: 0, static: 0 },
  },
  sassOptions: {
    silenceDeprecations: ["legacy-js-api"],
    // Позволяет писать `@use "variables" as v;` из любого файла на любой
    // глубине FSD-слоёв, без относительных путей вида "../../../styles".
    includePaths: [path.join(__dirname, "src/styles")],
  },
};

export default nextConfig;
