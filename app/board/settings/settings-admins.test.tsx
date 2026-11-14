import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { jsonResponse } from "../../../vitest.setup";
import type { Administrator } from "../shared/model";
import SettingsAdmins from "./settings-admins";

const admin: Administrator = {
  id: "a1",
  displayName: "Ada",
  email: "ada@example.com",
  revision: 1,
  accountStatus: "active",
  active: true,
};

describe("SettingsAdmins", () => {
  it("carga la lista y muestra las acciones de edición y borrado", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([admin])));

    render(<SettingsAdmins onProjectsChanged={vi.fn()} />);

    expect(await screen.findByText("Ada")).toBeTruthy();
    expect(screen.getByText("ada@example.com")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Editar administrador Ada/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Eliminar administrador Ada/ })).toBeTruthy();
  });

  it("añade una ficha y recarga la lista", async () => {
    const onProjectsChanged = vi.fn();
    const created: Administrator = { ...admin, id: "a2", displayName: "Nueva", email: "nueva@example.com", accountStatus: "pending" };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse(created))
      .mockResolvedValueOnce(jsonResponse([created]));
    vi.stubGlobal("fetch", fetchMock);

    render(<SettingsAdmins onProjectsChanged={onProjectsChanged} />);
    expect(await screen.findByText("Aún no hay administradores adicionales.")).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/Nombre de la ficha/), { target: { value: "Nueva" } });
    fireEvent.change(screen.getByLabelText(/Correo de ChatGPT/), { target: { value: "nueva@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Añadir ficha" }));

    expect(await screen.findByText("nueva@example.com")).toBeTruthy();
    expect(onProjectsChanged).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenNthCalledWith(2, expect.stringContaining("/api/administrators"), expect.objectContaining({ method: "POST" }));
  });

  it("elimina una ficha tras confirmar", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse([admin]))
      .mockResolvedValueOnce(jsonResponse({ id: admin.id }))
      .mockResolvedValueOnce(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    render(<SettingsAdmins onProjectsChanged={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: /Eliminar administrador Ada/ }));
    expect(screen.getByText(/¿Eliminar la ficha de/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar ficha" }));

    expect(await screen.findByText("Aún no hay administradores adicionales.")).toBeTruthy();
    expect(fetchMock).toHaveBeenNthCalledWith(2, expect.stringContaining("/api/administrators"), expect.objectContaining({ method: "DELETE" }));
  });

  it("muestra el error de la API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ message: "No autorizado." }, false, 403)));

    render(<SettingsAdmins onProjectsChanged={vi.fn()} />);

    expect(await screen.findByText("No autorizado.")).toBeTruthy();
  });

  it("edita una ficha existente", async () => {
    const edited: Administrator = { ...admin, displayName: "Ada Lovelace", revision: 2 };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse([admin]))
      .mockResolvedValueOnce(jsonResponse(edited))
      .mockResolvedValueOnce(jsonResponse([edited]));
    vi.stubGlobal("fetch", fetchMock);

    render(<SettingsAdmins onProjectsChanged={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: /Editar administrador Ada/ }));
    fireEvent.change(screen.getByLabelText(/Nombre de la ficha/), { target: { value: "Ada Lovelace" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Ada Lovelace")).toBeTruthy();
    expect(fetchMock).toHaveBeenNthCalledWith(2, expect.stringContaining("/api/administrators"), expect.objectContaining({ method: "PATCH" }));
  });
});
