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
    window.history.replaceState(null, "", "/");
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

  it("prioriza el documento del enlace y avisa si no está disponible", async () => {
    window.localStorage.setItem("aula-kanban:aula-documentos:last-opened:p1", "doc2");
    window.history.replaceState(null, "", "/?project=p1&doc=doc1");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      response({ active: [doc("doc1", "Uno"), doc("doc2", "Dos")], archived: [], deleted: [] }),
    ));

    const first = renderHook(() => useAulaDocumentSuite("p1"));
    await waitFor(() => expect(first.result.current.documentId).toBe("doc1"));
    first.unmount();

    window.history.replaceState(null, "", "/?project=p1&doc=ajeno");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      response({ active: [doc("doc1", "Uno")], archived: [], deleted: [] }),
    ));
    const second = renderHook(() => useAulaDocumentSuite("p1"));
    await waitFor(() => expect(second.result.current.documentId).toBe("doc1"));
    expect(second.result.current.error).toContain("enlace no está disponible");
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

  it("bloquea una segunda creación mientras prepara el primer documento", async () => {
    let resolveInitial!: (value: Response) => void;
    const initialPost = new Promise<Response>((resolve) => { resolveInitial = resolve; });
    let posts = 0;
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      if ((init?.method ?? "GET") === "GET") {
        return response({ active: [], archived: [], deleted: [] });
      }
      posts += 1;
      return initialPost;
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useAulaDocumentSuite("p1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.initializing).toBe(true);

    await act(async () => {
      expect(await result.current.createDocument()).toBeNull();
    });
    expect(posts).toBe(1);

    await act(async () => {
      resolveInitial(response({ document: doc("doc1", "Inicial") }, 201));
      await initialPost;
    });
    await waitFor(() => expect(result.current.documentId).toBe("doc1"));
    expect(result.current.initializing).toBe(false);
    expect(result.current.suite.active).toHaveLength(1);
    expect(posts).toBe(1);
  });

  it("reintenta la carga y selecciona el documento existente sin crear otro", async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error("sin conexión"))
      .mockResolvedValueOnce(response({ active: [doc("doc1", "Uno")], archived: [], deleted: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useAulaDocumentSuite("p1"));
    await waitFor(() => expect(result.current.error).toContain("No se pudieron cargar"));
    await act(async () => { await result.current.retry(); });

    await waitFor(() => expect(result.current.documentId).toBe("doc1"));
    expect(result.current.error).toBeNull();
    expect(fetchMock.mock.calls.filter((call) => call[1]?.method === "POST")).toHaveLength(0);
  });

  it("reintenta la creación inicial fallida sin dejar un estado vacío engañoso", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ active: [], archived: [], deleted: [] }))
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(response({ active: [], archived: [], deleted: [] }))
      .mockResolvedValueOnce(response({ document: doc("doc1", "Inicial") }, 201));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useAulaDocumentSuite("p1"));
    await waitFor(() => expect(result.current.error).toContain("No se pudo preparar"));
    expect(result.current.initializing).toBe(false);

    await act(async () => { await result.current.retry(); });
    await waitFor(() => expect(result.current.documentId).toBe("doc1"));
    expect(result.current.error).toBeNull();
    expect(fetchMock.mock.calls.filter((call) => call[1]?.method === "POST")).toHaveLength(2);
  });

  it("no relanza la creación inicial si ya se completó", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ active: [], archived: [], deleted: [] }))
      .mockResolvedValueOnce(response({ document: doc("doc1", "Inicial") }, 201))
      .mockResolvedValueOnce(response({ active: [doc("doc1", "Inicial")], archived: [], deleted: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useAulaDocumentSuite("p1"));
    await waitFor(() => expect(result.current.documentId).toBe("doc1"));
    await act(async () => { await result.current.retry(); });

    await waitFor(() => expect(result.current.documentId).toBe("doc1"));
    expect(fetchMock.mock.calls.filter((call) => call[1]?.method === "POST")).toHaveLength(1);
  });
});
