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
    include: ["app/**/*.test.{ts,tsx}", "lib/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
    restoreMocks: true,
    server: {
      deps: {
        // Las apps nativas traen CSS propio; hay que procesarlas con Vite para
        // que la importación de estilos no llegue a Node.
        inline: ["@smst/edu-tools"],
      },
    },
  },
});
