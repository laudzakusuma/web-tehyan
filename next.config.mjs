import { fileURLToPath } from "node:url";

export default {
  reactStrictMode: true,
  distDir: process.env.TEHYAN_DIST_DIR || ".next",
  outputFileTracingRoot: fileURLToPath(new URL(".", import.meta.url)),
};
