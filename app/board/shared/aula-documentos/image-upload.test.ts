import { afterEach, describe, expect, it, vi } from "vitest";
import {
  imageFilesFromDataTransfer,
  uploadAulaImage,
  validateAulaImageFile,
} from "./image-upload";

describe("subida de imágenes de Aula Documentos", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("valida tipo y tamaño antes de subir", () => {
    expect(validateAulaImageFile(new File(["x"], "foto.png", { type: "image/png" }))).toBeNull();
    expect(validateAulaImageFile(new File(["x"], "foto.svg", { type: "image/svg+xml" }))).toContain("PNG");
    expect(validateAulaImageFile(new File(["x".repeat(5 * 1024 * 1024 + 1)], "foto.png", { type: "image/png" }))).toContain("5 MB");
  });

  it("sube con la finalidad document-image y devuelve la URL", async () => {
    const sent: FormData[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_input: string, init?: RequestInit) => {
      sent.push(init?.body as FormData);
      return new Response(JSON.stringify({ url: "/api/files/foto" }), { status: 201 });
    }));

    await expect(uploadAulaImage("p1", new File(["png"], "foto.png", { type: "image/png" })))
      .resolves.toEqual({ ok: true, url: "/api/files/foto" });
    const body = sent[0];
    expect(body.get("purpose")).toBe("document-image");
    expect((body.get("file") as File).name).toBe("foto.png");
  });

  it("devuelve el mensaje del servidor cuando la cuota está llena", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      message: "La cuota de imágenes del proyecto está llena.",
    }), { status: 413 })));

    await expect(uploadAulaImage("p1", new File(["png"], "foto.png", { type: "image/png" })))
      .resolves.toEqual({ ok: false, message: "La cuota de imágenes del proyecto está llena." });
  });

  it("extrae imágenes de archivos e items del portapapeles", () => {
    const file = new File(["png"], "foto.png", { type: "image/png" });
    const transfer = { files: [file], items: [] } as unknown as DataTransfer;
    expect(imageFilesFromDataTransfer(transfer)).toEqual([file]);

    const itemFile = new File(["jpg"], "foto.jpg", { type: "image/jpeg" });
    const itemTransfer = {
      files: [],
      items: [{ kind: "file", getAsFile: () => itemFile }],
    } as unknown as DataTransfer;
    expect(imageFilesFromDataTransfer(itemTransfer)).toEqual([itemFile]);
  });
});
