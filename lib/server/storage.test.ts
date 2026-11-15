import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  bucket: null as unknown as { list: ReturnType<typeof vi.fn> } | null,
}));

vi.mock("cloudflare:workers", () => ({
  env: {
    get DB() {
      return null;
    },
    get BUCKET() {
      return mocks.bucket;
    },
  },
}));

import { MAX_BUCKET_PAGE, StorageUnavailableError, listBucketPage } from "./storage";

const uploaded = new Date("2026-11-15T10:00:00.000Z");

/**
 * Construye un objeto de R2 simulado.
 * @param key - Clave del objeto.
 * @returns El objeto con la forma que devuelve R2.
 */
function object(key: string) {
  return { key, size: 12, uploaded, etag: "etag-1" };
}

beforeEach(() => {
  mocks.bucket = { list: vi.fn(async () => ({ objects: [], truncated: false })) };
});

describe("listado paginado del bucket", () => {
  it("pide la primera página, adapta los metadatos y no devuelve cursor", async () => {
    mocks.bucket = { list: vi.fn(async () => ({ objects: [object("p/task-image/a.png")], truncated: false })) };
    const page = await listBucketPage();
    expect(mocks.bucket.list).toHaveBeenCalledWith({ limit: MAX_BUCKET_PAGE });
    expect(page).toEqual({
      objects: [{ key: "p/task-image/a.png", size: 12, uploaded: uploaded.getTime(), etag: "etag-1" }],
      truncated: false,
      cursor: null,
    });
  });

  it("pasa el cursor y lo devuelve solo cuando hay más páginas", async () => {
    mocks.bucket = { list: vi.fn(async () => ({ objects: [object("a")], truncated: true, cursor: "siguiente" })) };
    const page = await listBucketPage({ cursor: "actual", limit: 25 });
    expect(mocks.bucket.list).toHaveBeenCalledWith({ limit: 25, cursor: "actual" });
    expect(page.truncated).toBe(true);
    expect(page.cursor).toBe("siguiente");

    mocks.bucket = { list: vi.fn(async () => ({ objects: [object("b")], truncated: false, cursor: "ignorado" })) };
    expect((await listBucketPage()).cursor).toBeNull();
  });

  it("acota el tope a la página máxima y admite un bucket vacío", async () => {
    await listBucketPage({ limit: 500 });
    expect(mocks.bucket?.list).toHaveBeenLastCalledWith({ limit: MAX_BUCKET_PAGE });

    await listBucketPage({ limit: 0 });
    expect(mocks.bucket?.list).toHaveBeenLastCalledWith({ limit: MAX_BUCKET_PAGE });

    await listBucketPage({ limit: 3.9 });
    expect(mocks.bucket?.list).toHaveBeenLastCalledWith({ limit: 3 });

    mocks.bucket = { list: vi.fn(async () => ({ objects: [], truncated: false })) };
    expect(await listBucketPage()).toEqual({ objects: [], truncated: false, cursor: null });
  });

  it("falla con storage no disponible si no hay binding", async () => {
    mocks.bucket = null;
    await expect(listBucketPage()).rejects.toBeInstanceOf(StorageUnavailableError);
  });
});
