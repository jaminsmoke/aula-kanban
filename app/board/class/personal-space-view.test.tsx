import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PersonalSpaceView from "./personal-space-view";
import { jsonResponse } from "../../../vitest.setup";

const installed = [
  { id: "excalidraw", name: "Excalidraw", tagline: "Pizarra colaborativa para dibujar, explicar y anotar.", category: "Pizarras", favorite: true, position: 0, folder: null as string | null },
  { id: "mermaid", name: "Diagramas", tagline: "Escribe el diagrama en texto y míralo al instante.", category: "Diagramas", favorite: false, position: 1, folder: null as string | null },
];

const catalog = [
  { id: "eso-matematicas-1", title: "Matemáticas 1º ESO", level: "ESO", course: "1º", subject: "Matemáticas", sizeBytes: 12_094_989, available: true, url: "/api/books/eso-matematicas-1/file?project=p1", coverUrl: "/api/books/eso-matematicas-1/image?kind=cover&project=p1", attribution: "Textos Marea Verde", license: "CC BY-NC-SA 3.0", source: { name: "Textos Marea Verde", url: "https://apuntesmareaverde.org.es" }, version: "2026-11-16", storageKey: "books/eso-matematicas-1/2026-11-16.pdf" },
  { id: "bach-generales", title: "Matemáticas Generales", level: "Bachillerato", course: "1º", subject: "Generales", sizeBytes: 13_800_639, available: false, url: null, coverUrl: null, attribution: "Textos Marea Verde", license: "CC BY-NC-SA 3.0", source: { name: "Textos Marea Verde", url: "https://apuntesmareaverde.org.es" }, version: null, storageKey: null },
];

const assignment = [
  { id: "eso-matematicas-1", enabled: true },
  { id: "bach-generales", enabled: true },
];

function mockFetch(enabledBooks = assignment) {
  return vi.fn(async (url: string) => {
    if (String(url).includes("project-books")) return jsonResponse({ books: enabledBooks });
    if (String(url).includes("/api/books")) return jsonResponse({ books: catalog });
    return jsonResponse({ apps: installed });
  });
}

describe("PersonalSpaceView", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("es un escritorio con los iconos en el orden personal, sin tienda", async () => {
    vi.stubGlobal("fetch", mockFetch());
    render(<PersonalSpaceView role="student" projectId="p1" />);

    const desktop = await screen.findByLabelText("Escritorio personal");
    expect(desktop).toBeTruthy();
    expect(screen.getByRole("button", { name: /Excalidraw/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Diagramas/ })).toBeTruthy();
    // Sin tienda: no hay catálogo ni botón de Aula Store.
    expect(screen.queryByRole("button", { name: /Aula Store/ })).toBeNull();
    expect(screen.queryByRole("region", { name: "Aula Store" })).toBeNull();
  });

  it("abre la ventana de la app al pulsar su icono", async () => {
    vi.stubGlobal("fetch", mockFetch());
    render(<PersonalSpaceView role="student" projectId="p1" />);

    fireEvent.click(await screen.findByRole("button", { name: /Excalidraw/ }));
    expect(await screen.findByRole("dialog", { name: "Excalidraw" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cerrar Excalidraw" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Minimizar Excalidraw" })).toBeTruthy();
  });

  it("agrupa apps en una carpeta y las abre desde su ventana", async () => {
    const grouped = [
      { ...installed[0], folder: "Mis pizarras" },
      { ...installed[1], folder: "Mis pizarras" },
    ];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => String(url).includes("project-books")
      ? jsonResponse({ books: [] })
      : jsonResponse({ apps: grouped })));
    render(<PersonalSpaceView role="student" projectId="p1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Abrir carpeta Mis pizarras" }));
    const folder = await screen.findByRole("dialog", { name: "Mis pizarras" });
    expect(folder).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Excalidraw/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Excalidraw/ }));
    expect(await screen.findByRole("dialog", { name: "Excalidraw" })).toBeTruthy();
  });

  it("guarda la carpeta escrita en el organizador y la aplica al escritorio", async () => {
    let personal = installed;
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("project-books")) return jsonResponse({ books: [] });
      if (init?.method === "PUT") {
        const body = JSON.parse(String(init.body)) as { items: { id: string; folder: string | null }[] };
        personal = personal.map((app) => ({
          ...app,
          folder: body.items.find((item) => item.id === app.id)?.folder ?? null,
        }));
      }
      return jsonResponse({ apps: personal });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<PersonalSpaceView role="student" projectId="p1" />);

    fireEvent.click(await screen.findByRole("button", { name: /Organizar/ }));
    fireEvent.change(await screen.findByLabelText("Carpeta de Excalidraw"), { target: { value: "  Mis   pizarras  " } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar carpetas" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/personal-apps"), expect.objectContaining({ method: "PUT" })));
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT");
    expect(JSON.parse(String(put?.[1]?.body)).items).toContainEqual({ id: "excalidraw", favorite: true, position: 0, folder: "Mis pizarras" });
    expect(await screen.findByRole("button", { name: "Abrir carpeta Mis pizarras" })).toBeTruthy();
  });

  it("usa «Maletín docente» para el profesorado", async () => {
    vi.stubGlobal("fetch", mockFetch());
    render(<PersonalSpaceView role="teacher" projectId="p1" />);
    expect(await screen.findByLabelText("Maletín docente")).toBeTruthy();
  });

  it("muestra el icono Libros cuando hay libros habilitados", async () => {
    vi.stubGlobal("fetch", mockFetch());
    render(<PersonalSpaceView role="student" projectId="p1" />);
    expect(await screen.findByRole("button", { name: /Libros/ })).toBeTruthy();
  });

  it("no muestra el icono Libros sin libros habilitados", async () => {
    vi.stubGlobal("fetch", mockFetch([]));
    render(<PersonalSpaceView role="student" projectId="p1" />);
    await screen.findByRole("button", { name: /Excalidraw/ });
    expect(screen.queryByRole("button", { name: /Libros/ })).toBeNull();
  });

  it("abre la carpeta Libros y el visor de solo lectura sin descarga", async () => {
    vi.stubGlobal("fetch", mockFetch());
    render(<PersonalSpaceView role="student" projectId="p1" />);
    fireEvent.click(await screen.findByRole("button", { name: /Libros/ }));
    await screen.findByRole("dialog", { name: "Libros" });
    fireEvent.click(await screen.findByRole("button", { name: /Matemáticas 1º ESO/ }));
    const frame = await screen.findByTitle("Lector de Matemáticas 1º ESO", {}, { timeout: 3000 });
    expect(frame.getAttribute("src")).toBe("/api/books/eso-matematicas-1/file?project=p1");
    // Solo lectura: no hay botón ni enlace de descarga en el visor.
    expect(frame.closest(".store-window")?.querySelectorAll("[download]")).toHaveLength(0);
    expect(screen.queryByRole("link", { name: /Descargar|descargar/ })).toBeNull();
  });

  it("muestra el estado vacío sin herramientas instaladas", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => String(url).includes("project-books")
      ? jsonResponse({ books: [] })
      : jsonResponse({ apps: [] })));
    render(<PersonalSpaceView role="student" projectId="p1" />);
    expect(await screen.findByText(/Todavía no hay herramientas instaladas/)).toBeTruthy();
  });

  it("muestra un error sin listas vacías", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("sin conexión"); }));
    render(<PersonalSpaceView role="student" projectId="p1" />);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("No se pudieron consultar tus herramientas");
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Excalidraw/ })).toBeNull();
  });
});
