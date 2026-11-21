import { describe, expect, it } from "vitest";
import type { LoadedDocument, VersionedSaveResult } from "./versioned-document";

describe("contrato de documento versionado", () => {
  it("distingue carga, guardado y conflicto", () => {
    const loaded: LoadedDocument<{ value: number }> = { state: { value: 1 }, updatedAt: 2, ok: true };
    const saved: VersionedSaveResult = { status: "saved", updatedAt: 3 };
    const conflict: VersionedSaveResult = { status: "conflict", updatedAt: 2 };
    const failed: VersionedSaveResult = { status: "failed" };

    expect([loaded.updatedAt, saved.status, conflict.status, failed.status])
      .toEqual([2, "saved", "conflict", "failed"]);
  });
});
