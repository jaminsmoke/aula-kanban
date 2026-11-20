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

import { AULA_IMAGE_MAX_BYTES } from "../domain/aula-documentos/image";
import { MAX_BUCKET_PAGE, StorageUnavailableError, listBucketPage } from "./storage/repository";
import {
  MAX_IMAGE_BYTES,
  MAX_PROJECT_DOCUMENT_COPIES,
  MAX_PROJECT_DOCUMENT_COPY_BYTES,
  MAX_PROJECT_DOCUMENT_IMAGE_BYTES,
  fitsDocumentCopyQuota,
  fitsDocumentImageQuota,
  uploadLimitBytes,
  uploadPurposes,
  validateUpload,
} from "./storage/quota";

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

describe("subidas de imágenes de documento", () => {
  it("declara la finalidad y acepta solo imágenes seguras", () => {
    expect(uploadPurposes).toContain("document-image");
    expect(validateUpload("document-image", "image/png", 1_024)).toBeNull();
    expect(validateUpload("document-image", "image/jpeg", 1_024)).toBeNull();
    expect(validateUpload("document-image", "image/webp", 1_024)).toBeNull();
    expect(validateUpload("document-image", "image/gif", 1_024)).toBeNull();
    expect(validateUpload("document-image", "image/svg+xml", 1_024)).toContain("no admitido");
    expect(validateUpload("document-image", "text/html", 1_024)).toContain("no admitido");
  });

  it("aplica el límite de 5 MB por imagen y la cuota de 50 MB por proyecto", () => {
    expect(MAX_IMAGE_BYTES).toBe(AULA_IMAGE_MAX_BYTES);
    expect(uploadLimitBytes("task-image")).toBe(AULA_IMAGE_MAX_BYTES);
    expect(uploadLimitBytes("document")).toBe(10 * 1024 * 1024);
    expect(uploadLimitBytes("document-copy")).toBe(60 * 1024 * 1024);
    expect(validateUpload("document-image", "image/png", 5 * 1024 * 1024 + 1)).toContain("5 MB");
    expect(MAX_PROJECT_DOCUMENT_IMAGE_BYTES).toBe(50 * 1024 * 1024);
    expect(fitsDocumentImageQuota(0, MAX_PROJECT_DOCUMENT_IMAGE_BYTES)).toBe(true);
    expect(fitsDocumentImageQuota(1, MAX_PROJECT_DOCUMENT_IMAGE_BYTES)).toBe(false);
    expect(fitsDocumentImageQuota(-1, 1)).toBe(false);
  });
});

describe("copias portables", () => {
  it("declara la finalidad y acepta ZIP con el límite de copia", () => {
    expect(uploadPurposes).toContain("document-copy");
    expect(validateUpload("document-copy", "application/zip", 1_024)).toBeNull();
    expect(validateUpload("document-copy", "application/zip", 60 * 1024 * 1024)).toBeNull();
    expect(validateUpload("document-copy", "application/zip", 60 * 1024 * 1024 + 1)).toContain("tamaño máximo");
    expect(validateUpload("document-copy", "application/octet-stream", 1_024)).toContain("no admitido");
  });

  it("aplica la cuota y el número máximo de copias", () => {
    expect(MAX_PROJECT_DOCUMENT_COPY_BYTES).toBe(200 * 1024 * 1024);
    expect(MAX_PROJECT_DOCUMENT_COPIES).toBe(20);
    expect(fitsDocumentCopyQuota(0, MAX_PROJECT_DOCUMENT_COPY_BYTES)).toBe(true);
    expect(fitsDocumentCopyQuota(1, MAX_PROJECT_DOCUMENT_COPY_BYTES)).toBe(false);
    expect(fitsDocumentCopyQuota(-1, 1)).toBe(false);
  });
});
