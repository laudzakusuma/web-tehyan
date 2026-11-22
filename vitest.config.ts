import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    exclude: [...configDefaults.exclude, "**/.qa/**"],
    env: loadEnv("test", process.cwd(), "DATABASE_URL"),
  },
});
