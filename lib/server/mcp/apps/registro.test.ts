import { describe, expect, it } from "vitest";
import { NATIVE_APP_IDS } from "../../../native-apps";
import { APP_MCP_DECLARACIONES, herramientasDeApps } from "./registro";

describe("manifiesto MCP de apps", () => {
  it("tiene exactamente una declaración por app del catálogo", () => {
    expect(Object.keys(APP_MCP_DECLARACIONES).sort()).toEqual([...NATIVE_APP_IDS].sort());
    for (const appId of NATIVE_APP_IDS) {
      expect(APP_MCP_DECLARACIONES[appId].appId).toBe(appId);
    }
  });

  it("explica por qué una app no tiene herramientas y no deja una lista vacía sin motivo", () => {
    for (const declaracion of Object.values(APP_MCP_DECLARACIONES)) {
      if (declaracion.herramientas.length === 0) {
        expect(declaracion.pendiente).toBeTruthy();
      } else {
        expect(declaracion.pendiente).toBeUndefined();
      }
    }
  });

  it("agrega exactamente las herramientas declaradas", () => {
    const declaradas = Object.values(APP_MCP_DECLARACIONES).flatMap((declaracion) => declaracion.herramientas);
    expect(herramientasDeApps).toEqual(declaradas);
  });
});
