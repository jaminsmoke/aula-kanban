import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BooksToolsPanel from "./books-tools-panel";

const catalog = [
  {
    id: "eso-matematicas-1",
    title: "Matemáticas 1º ESO",
    level: "ESO",
    course: "1º",
    subject: "Matemáticas",
    sizeBytes: 12_094_989,
    enabled: false,
  },
  {
    id: "bach-generales",
    title: "Matemáticas Generales",
    level: "Bachillerato",
    course: "1º",
    subject: "Generales",
    sizeBytes: 13_800_639,
    enabled: true,
  },
];

let savedBody: unknown = null;

describe("BooksToolsPanel", () => {
  beforeEach(() => {
    savedBody = null;
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "PUT") {
        savedBody = JSON.parse(String(init.body));
        return { ok: true, json: async () => ({ books: catalog, saved: [] }) };
      }
      return { ok: true, json: async () => ({ books: catalog }) };
    }));
  });

  it("lista los libros por nivel con su selección actual", async () => {
    render(<BooksToolsPanel projectId="p1" />);
    await waitFor(() => expect(screen.getByText("Matemáticas 1º ESO")).toBeTruthy());
    expect((screen.getByRole("checkbox", { name: /Matemáticas 1º ESO/ }) as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole("checkbox", { name: /Matemáticas Generales/ }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText("1 de 2")).toBeTruthy();
  });

  it("guarda la selección completa al pulsar Guardar", async () => {
    render(<BooksToolsPanel projectId="p1" />);
    await waitFor(() => expect(screen.getByText("Matemáticas 1º ESO")).toBeTruthy());
    fireEvent.click(screen.getByRole("checkbox", { name: /Matemáticas 1º ESO/ }));
    await user_click_save();
    await waitFor(() => expect(savedBody).toEqual({ bookIds: ["bach-generales", "eso-matematicas-1"] }));
  });

  it("el toggle maestro selecciona y deselecciona todos", async () => {
    render(<BooksToolsPanel projectId="p1" />);
    await waitFor(() => expect(screen.getByText("Matemáticas 1º ESO")).toBeTruthy());
    fireEvent.click(screen.getByRole("checkbox", { name: /Todos los libros/ }));
    expect(screen.getByText("2 de 2")).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: /Todos los libros/ }));
    expect(screen.getByText("0 de 2")).toBeTruthy();
  });

  it("muestra el error con reintento si no cargan los libros", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, json: async () => ({}) })));
    render(<BooksToolsPanel projectId="p1" />);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("No se pudieron consultar");
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
  });
});

async function user_click_save() {
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
}
