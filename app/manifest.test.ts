import { describe, expect, it } from "vitest";
import manifest from "./manifest";

const data = manifest();

describe("manifest.webmanifest", () => {
  it("declara nombre, arranque, modo y colores de la marca", () => {
    expect(data.name).toBe("Aula Kanban");
    expect(data.short_name).toBe("Aula Kanban");
    expect(data.start_url).toBe("/");
    expect(data.display).toBe("standalone");
    expect(data.lang).toBe("es");
    expect(data.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(data.background_color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("incluye iconos PNG de 192 y 512 y el favicon vectorial", () => {
    expect(data.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }),
        expect.objectContaining({ src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }),
        expect.objectContaining({ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }),
      ]),
    );
  });
});
