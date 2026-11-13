import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["app/**/*.test.{ts,tsx}"],
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
