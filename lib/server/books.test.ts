import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  bucket: null as unknown as { get: ReturnType<typeof vi.fn> } | null,
}));

vi.mock("cloudflare:workers", () => ({
  env: {
    get BUCKET() {
      return mocks.bucket;
    },
  },
}));

import { listBooks, readBookFile } from "./books";

describe("listBooks", () => {
  it("marca disponibles solo los libros con clave de almacenamiento", () => {
    const books = listBooks("p1");
    expect(books.length).toBeGreaterThan(0);
    for (const book of books) {
      expect(book.available).toBe(book.storageKey !== null);
      expect(book.url).toBe(
        book.storageKey ? `/api/books/${book.id}/file?project=p1` : null,
      );
      // La procedencia viaja siempre, esté ingerido o no.
      expect(book.license).toContain("CC BY-NC-SA");
      expect(book.attribution.trim().length).toBeGreaterThan(0);
      expect(book.source.url).toMatch(/^https:\/\//);
    }
  });
});

describe("readBookFile", () => {
  beforeEach(() => {
    mocks.bucket = null;
  });

  it("devuelve not_found para ids desconocidos y libros sin ingerir", async () => {
    expect(await readBookFile("inexistente")).toEqual({ status: "not_found" });
    const pending = listBooks("p1").find((book) => !book.available);
    if (pending) expect(await readBookFile(pending.id)).toEqual({ status: "not_found" });
  });

  it("devuelve storage_unavailable sin bucket para un libro ingerido", async () => {
    const ingested = listBooks("p1").find((book) => book.available);
    if (!ingested) return;
    expect(await readBookFile(ingested.id)).toEqual({ status: "storage_unavailable" });
  });

  it("lee el objeto de R2 cuando el libro está ingerido", async () => {
    const ingested = listBooks("p1").find((book) => book.available);
    if (!ingested) return;
    const object = { body: "pdf", size: 12 };
    mocks.bucket = { get: vi.fn(async () => object) };
    const found = await readBookFile(ingested.id);
    expect(mocks.bucket.get).toHaveBeenCalledWith(ingested.storageKey);
    expect(found.status).toBe("ok");
    if (found.status === "ok") expect(found.object).toBe(object);
  });
});
