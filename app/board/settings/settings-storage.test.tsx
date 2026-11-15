import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { jsonResponse } from "../../../vitest.setup";
import SettingsStorage from "./settings-storage";

describe("SettingsStorage", () => {
  it("muestra el estado correcto y el número de archivos", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ database: true, bucket: true, bucketReachable: true, uploads: 3, ok: true })));
    render(<SettingsStorage />);
    expect(await screen.findByText("Disponible")).toBeTruthy();
    expect(screen.getByText("3 archivos con metadatos. Las imágenes y documentos se pueden subir.")).toBeTruthy();
  });

  it("avisa cuando falta R2", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ database: true, bucket: false, bucketReachable: false, uploads: 2, ok: false })));
    render(<SettingsStorage />);
    expect(await screen.findByText("Revisar configuración")).toBeTruthy();
    expect(screen.getByText("Las imágenes y documentos no se podrán subir ni mostrar hasta que R2 esté disponible.")).toBeTruthy();
  });

  it("muestra el error del diagnóstico", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ message: "Solo el propietario o un administrador pueden consultar el almacenamiento." }, false, 403)));
    render(<SettingsStorage />);
    expect((await screen.findByRole("alert")).textContent).toContain("Solo el propietario");
  });
});
