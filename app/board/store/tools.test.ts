import { Gem } from "lucide-react";
import { describe, expect, it } from "vitest";
import { visibleTools, type StoreTool } from "./tools";

const shared: StoreTool = { id: "shared", name: "Compartida", description: "", tagline: "", categories: ["Educación"], subcategory: "Herramientas", cover: "", features: [], appVersion: "1.0.0", upstream: { name: "test", version: "1.0.0" }, window: { width: 880, height: 560 }, icon: Gem, roles: ["teacher", "student"] };
const teacherOnly: StoreTool = { id: "teacher", name: "Profesor", description: "", tagline: "", categories: ["Educación"], subcategory: "Herramientas", cover: "", features: [], appVersion: "1.0.0", upstream: { name: "test", version: "1.0.0" }, window: { width: 880, height: 560 }, icon: Gem, roles: ["teacher"] };
const catalog = [shared, teacherOnly];

describe("catálogo nativo", () => {
  it("respeta los roles y los administradores ven todas las herramientas", () => {
    expect(visibleTools("student", catalog)).toEqual([shared]);
    expect(visibleTools("teacher", catalog)).toEqual(catalog);
    expect(visibleTools("admin", catalog)).toEqual(catalog);
  });
  it("solo incluye aplicaciones nativas", () => {
    expect(visibleTools("owner").map(tool => tool.id)).toEqual(["excalidraw", "calculadora", "tabla-periodica", "blockly", "mermaid", "ajedrez", "tarjetas", "fisica"]);
  });
});
