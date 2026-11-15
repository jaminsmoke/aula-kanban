import { describe, expect, it } from "vitest";
import { crearMiniaturaDeArchivo } from "./image-thumbnail";

describe("crearMiniaturaDeArchivo", () => {
  it("deja los GIF intactos para no perder la animación", async () => {
    const gif = new File(["GIF89a"], "animacion.gif", { type: "image/gif" });

    expect(await crearMiniaturaDeArchivo(gif)).toBeNull();
  });

  it("rechaza archivos que no son imágenes reducibles", async () => {
    const documento = new File(["hola"], "nota.txt", { type: "text/plain" });

    expect(await crearMiniaturaDeArchivo(documento)).toBeNull();
  });

  it("se rinde si el navegador no puede generar derivados", async () => {
    // jsdom no trae `createImageBitmap` ni `OffscreenCanvas`.
    const imagen = new File(["png"], "foto.png", { type: "image/png" });

    expect(await crearMiniaturaDeArchivo(imagen)).toBeNull();
  });
});
