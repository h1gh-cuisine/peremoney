import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev и production build не должны перезаписывать один Client Manifest.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  outputFileTracingRoot: __dirname,
  sassOptions: {
    silenceDeprecations: ["legacy-js-api"],
    // Позволяет писать `@use "variables" as v;` из любого файла на любой
    // глубине FSD-слоёв, без относительных путей вида "../../../styles".
    includePaths: [path.join(__dirname, "src/styles")],
  },
};

export default nextConfig;
