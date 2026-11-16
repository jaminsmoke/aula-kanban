import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TablaPeriodicaApp from "./tabla-periodica-app";

describe("Tabla periódica", () => {
  it("busca en español y muestra la ficha del elemento", async () => {
    render(<TablaPeriodicaApp />);
    fireEvent.change(await screen.findByRole("searchbox", { name: "Buscar elemento" }), { target: { value: "sodio" } });
    expect(screen.getByRole("status").textContent).toBe("1 de 118");
    fireEvent.click(screen.getByRole("gridcell", { name: /Sodio/ }));
    expect(screen.getByText("Sodio")).toBeTruthy();
    expect(document.querySelector(".pt-detail-cat")?.textContent).toBe("Metal alcalino");
    expect(screen.getByRole("img", { name: "Modelo atómico de Na: 11 electrones en 3 capas" })).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Descripción" }));
    expect(screen.getByText(/Sodio \(Na, número atómico 11\)/)).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Historia" }));
    expect(screen.getByText("Descubierto por")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ver en Wikipedia" })).toBeTruthy();
  });

  it("filtra por bloque", async () => {
    render(<TablaPeriodicaApp />);
    fireEvent.change(await screen.findByLabelText("Bloque"), { target: { value: "f" } });
    expect(screen.getByRole("status").textContent).toBe("28 de 118");
  });

  it("marca los elementos con categoría predicha", async () => {
    render(<TablaPeriodicaApp />);
    fireEvent.change(await screen.findByRole("searchbox", { name: "Buscar elemento" }), { target: { value: "oganeson" } });
    fireEvent.click(screen.getByRole("gridcell", { name: /Oganes/ }));
    expect(document.querySelector(".pt-detail-head.is-predicted")).toBeTruthy();
    expect(document.querySelector(".pt-detail-cat")?.textContent).toContain("predicha");
  });
});
