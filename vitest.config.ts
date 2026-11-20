import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "cloudflare:workers": fileURLToPath(new URL("./vitest.cloudflare-workers.ts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    include: ["app/**/*.test.{ts,tsx}", "lib/**/*.test.{ts,tsx}", "scripts/**/*.test.mjs"],
    setupFiles: ["./vitest.setup.ts"],
    restoreMocks: true,
  },
});
