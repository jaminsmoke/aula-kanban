import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BooksFolder from "./books-folder";

const catalog = [
  { id: "eso-matematicas-1", title: "Matemáticas 1º ESO", level: "ESO", course: "1º", subject: "Matemáticas", sizeBytes: 12_094_989, available: true, url: "/api/books/eso-matematicas-1/file?project=p1", coverUrl: "/api/books/eso-matematicas-1/image?kind=cover&project=p1" },
  { id: "bach-generales", title: "Matemáticas Generales", level: "Bachillerato", course: "1º", subject: "Generales", sizeBytes: 13_800_639, available: false, url: null, coverUrl: null },
];

describe("BooksFolder", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => ({
      ok: true,
      json: async () => String(url).includes("project-books")
        ? { books: catalog.map((book) => ({ id: book.id, enabled: true })) }
        : { books: catalog },
    })));
  });

  it("lista solo los libros habilitados, con los no ingeridos deshabilitados", async () => {
    render(<BooksFolder projectId="p1" onOpen={() => {}} />);
    await waitFor(() => expect(screen.getByText("Matemáticas 1º ESO")).toBeTruthy());
    expect(screen.getByText("Matemáticas Generales")).toBeTruthy();
    expect((screen.getByRole("button", { name: /Matemáticas Generales/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("button", { name: /Matemáticas 1º ESO/ })).toBeTruthy();
  });

  it("abre el libro seleccionado", async () => {
    const onOpen = vi.fn();
    render(<BooksFolder projectId="p1" onOpen={onOpen} />);
    await waitFor(() => expect(screen.getByText("Matemáticas 1º ESO")).toBeTruthy());
    screen.getByRole("button", { name: /Matemáticas 1º ESO/ }).click();
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
