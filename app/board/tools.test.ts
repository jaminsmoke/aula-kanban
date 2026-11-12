import { Gem } from "lucide-react";
import { describe, expect, it } from "vitest";
import { isToolReady, toolsNeedingVps, visibleTools, type SpaceTool } from "./tools";

const shared: SpaceTool = { id: "shared", name: "Compartida", description: "", icon: Gem, host: "site", envVars: [], roles: ["teacher", "student"] };
const teacherOnly: SpaceTool = { id: "teacher", name: "Profesor", description: "", icon: Gem, host: "vps", envVars: ["VITE_TEACHER_URL"], roles: ["teacher"] };
const catalog = [shared, teacherOnly];

describe("visibleTools", () => {
  it("muestra a cada rol solo sus herramientas", () => {
    expect(visibleTools("student", catalog).map((tool) => tool.id)).toEqual(["shared"]);
    expect(visibleTools("teacher", catalog).map((tool) => tool.id)).toEqual(["shared", "teacher"]);
  });

  it("el administrador ve todas las herramientas", () => {
    expect(visibleTools("admin", catalog)).toEqual(catalog);
    expect(visibleTools("owner", catalog)).toEqual(catalog);
  });

  it("Nodum, Excalidraw y AFFiNE son las herramientas del hub", () => {
    expect(visibleTools("student").map((tool) => tool.id)).toEqual(["nodum", "excalidraw", "affine", "n8n"]);
    expect(visibleTools("owner").map((tool) => tool.id)).toEqual(["nodum", "excalidraw", "affine", "n8n"]);
  });
});

describe("estado del catálogo (site vs vps)", () => {
  it("las herramientas del propio Site siempre están listas", () => {
    expect(isToolReady(shared)).toBe(true);
  });

  it("las herramientas del VPS sin URL configurada no están listas", () => {
    // La suite no fija VITE_*_URL: la instancia del VPS no está configurada.
    expect(isToolReady(teacherOnly)).toBe(false);
    expect(toolsNeedingVps(catalog).map((tool) => tool.id)).toEqual(["teacher"]);
  });

  it("Excalidraw (Site) está lista y Nodum/AFFiNE (VPS) no, sin variables", () => {
    const byId = new Map(visibleTools("student").map((tool) => [tool.id, tool]));
    expect(isToolReady(byId.get("excalidraw")!)).toBe(true);
    expect(isToolReady(byId.get("nodum")!)).toBe(false);
    expect(isToolReady(byId.get("affine")!)).toBe(false);
    expect(isToolReady(byId.get("n8n")!)).toBe(false);
    expect(toolsNeedingVps().map((tool) => tool.id)).toEqual(["nodum", "affine", "n8n"]);
  });
});
