import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BooksView from "./books-view";

const books = [
  {
    id: "eso-matematicas-1",
    title: "Matemáticas 1º ESO",
    level: "ESO",
    course: "1º",
    subject: "Matemáticas",
    tagline: "Libro completo LOMLOE.",
    description: "Libro completo de Matemáticas de 1º de ESO.",
    source: { name: "Textos Marea Verde", url: "https://apuntesmareaverde.org.es" },
    license: "CC BY-NC-SA 3.0",
    attribution: "Textos Marea Verde (apuntesmareaverde.org.es)",
    format: "pdf",
    sizeBytes: 12_094_989,
    version: "2026-11-16",
    storageKey: "books/eso-matematicas-1/2026-11-16.pdf",
    coverKey: "books/eso-matematicas-1/2026-11-16-cover.jpg",
    backKey: "books/eso-matematicas-1/2026-11-16-back.jpg",
    available: true,
    url: "/api/books/eso-matematicas-1/file?project=p1",
    coverUrl: "/api/books/eso-matematicas-1/image?kind=cover&project=p1",
    backUrl: "/api/books/eso-matematicas-1/image?kind=back&project=p1",
  },
  {
    id: "bach-matematicas-1",
    title: "Matemáticas I",
    level: "Bachillerato",
    course: "1º",
    subject: "Matemáticas",
    tagline: "Libro completo de Bachillerato.",
    description: "Libro completo de Matemáticas I de Bachillerato.",
    source: { name: "Textos Marea Verde", url: "https://apuntesmareaverde.org.es" },
    license: "CC BY-NC-SA 3.0",
    attribution: "Textos Marea Verde (apuntesmareaverde.org.es)",
    format: "pdf",
    sizeBytes: 15_335_470,
    version: null,
    storageKey: null,
    coverKey: null,
    backKey: null,
    available: false,
    url: null,
    coverUrl: null,
    backUrl: null,
  },
];

describe("BooksView", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ books }),
    })));
  });

  it("lista los libros seccionados por nivel", async () => {
    render(<BooksView projectId="p1" />);
    await waitFor(() => expect(screen.getByText("Matemáticas 1º ESO")).toBeTruthy());
    expect(screen.getByRole("region", { name: "Libros de ESO" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Libros de Bachillerato" })).toBeTruthy();
  });

  it("muestra la portada en la tarjeta", async () => {
    render(<BooksView projectId="p1" />);
    await waitFor(() => expect(screen.getByText("Matemáticas 1º ESO")).toBeTruthy());
    const cover = screen.getByAltText("Portada de Matemáticas 1º ESO");
    expect(cover.getAttribute("src")).toBe("/api/books/eso-matematicas-1/image?kind=cover&project=p1");
  });

  it("muestra portada y contraportada en la ficha", async () => {
    render(<BooksView projectId="p1" />);
    await waitFor(() => expect(screen.getByText("Matemáticas 1º ESO")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: /Ver detalles de Matemáticas 1º ESO/ }));
    const dialog = await screen.findByRole("dialog", { name: "Matemáticas 1º ESO" });
    expect(within(dialog).getByAltText("Portada de Matemáticas 1º ESO")).toBeTruthy();
    expect(within(dialog).getByAltText("Contraportada de Matemáticas 1º ESO")).toBeTruthy();
  });

  it("muestra la procedencia en la ficha y abre el visor en ventana", async () => {
    render(<BooksView projectId="p1" />);
    await waitFor(() => expect(screen.getByText("Matemáticas 1º ESO")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: /Ver detalles de Matemáticas 1º ESO/ }));
    const dialog = await screen.findByRole("dialog", { name: "Matemáticas 1º ESO" });
    expect(dialog.textContent).toContain("CC BY-NC-SA 3.0");
    expect(dialog.textContent).toContain("Textos Marea Verde");
    fireEvent.click(within(dialog).getByRole("button", { name: /Leer/ }));
    const frame = await screen.findByTitle("Lector de Matemáticas 1º ESO");
    expect(frame.getAttribute("src")).toBe("/api/books/eso-matematicas-1/file?project=p1");
  });

  it("sin ingesta muestra el aviso y no ofrece lectura", async () => {
    render(<BooksView projectId="p1" />);
    await waitFor(() => expect(screen.getByText("Matemáticas I")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: /Ver detalles de Matemáticas I/ }));
    const dialog = await screen.findByRole("dialog", { name: "Matemáticas I" });
    expect(dialog.textContent).toContain("pendiente de ingesta");
    expect(dialog.querySelector("iframe")).toBeNull();
  });
});
