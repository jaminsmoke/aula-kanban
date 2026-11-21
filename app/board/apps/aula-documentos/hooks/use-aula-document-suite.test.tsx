/** @vitest-environment jsdom */

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAulaDocumentSuite } from "./use-aula-document-suite";

const doc = (id: string, title: string) => ({
  id,
  projectId: "p1",
  title,
  excerpt: "",
  status: "active" as const,
  createdAt: 1,
  updatedAt: 2,
  archivedAt: null,
  createdBy: null,
  updatedBy: null,
});

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json" },
});

describe("suite de Aula Documentos", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("recupera el último documento y permite crear otro", async () => {
    window.localStorage.setItem("aula-kanban:aula-documentos:last-opened:p1", "doc2");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ active: [doc("doc1", "Uno"), doc("doc2", "Dos")], archived: [], deleted: [] }))
      .mockResolvedValueOnce(response({ document: doc("doc3", "Tres") }, 201))
      .mockResolvedValueOnce(response({ active: [doc("doc1", "Uno"), doc("doc2", "Dos"), doc("doc3", "Tres")], archived: [], deleted: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useAulaDocumentSuite("p1"));
    await waitFor(() => expect(result.current.documentId).toBe("doc2"));
    expect(fetchMock).toHaveBeenCalledWith("/api/aula-documentos?project=p1", { cache: "no-store" });

    await act(async () => {
      await result.current.createDocument(undefined, "Tres");
    });
    await waitFor(() => expect(result.current.documentId).toBe("doc3"));
    expect(result.current.suite.active.map((item) => item.id)).toEqual(["doc1", "doc2", "doc3"]);
    expect(window.localStorage.getItem("aula-kanban:aula-documentos:last-opened:p1")).toBe("doc3");
  });

  it("crea un documento inicial si el proyecto está vacío", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ active: [], archived: [], deleted: [] }))
      .mockResolvedValueOnce(response({ document: doc("doc1", "Documento sin título") }, 201));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useAulaDocumentSuite("p1"));
    await waitFor(() => expect(result.current.documentId).toBe("doc1"));
    expect(result.current.suite.active).toHaveLength(1);
  });
});
