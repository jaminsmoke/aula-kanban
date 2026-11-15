import { describe, expect, it } from "vitest";
import { NATIVE_APPS, NATIVE_APP_IDS } from "../../../lib/native-apps";
import { storeTools, toolApps, toolWindow } from "./registry";

describe("registro de apps nativas", () => {
  it("mantiene sincronizados el catálogo, la API y los componentes", () => {
    expect(NATIVE_APP_IDS).toEqual(NATIVE_APPS.map((app) => app.id));
    for (const meta of NATIVE_APPS) {
      expect(storeTools.find((tool) => tool.id === meta.id)).toBeDefined();
      expect(toolApps[meta.id]).toBeDefined();
      expect(toolWindow(meta.id)).toEqual(meta.window);
    }
  });
});
