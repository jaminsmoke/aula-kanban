import { describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Paridad MCP ↔ HTTP del alta de proyectos (MCP-08): la ruta y la
 * herramienta comparten `createProject`, así que devuelven el mismo
 * proyecto y el mismo 403. Vive en `app/` porque solo esta capa puede
 * importar las dos orillas.
 */

type Usuario = { userId: string; email: string; displayName: string; fullName: null };
const identidad: Record<"owner" | "admin" | "teacher", Usuario> = {
  owner: { userId: "u-owner", email: "owner@example.com", displayName: "owner@example.com", fullName: null },
  admin: { userId: "u-admin", email: "admin@example.com", displayName: "admin@example.com", fullName: null },
  teacher: { userId: "u-teacher", email: "teacher@example.com", displayName: "teacher@example.com", fullName: null },
};
let usuarioActual: Usuario = identidad.owner;
const proyecto = { id: "11111111-1111-4111-8111-111111111111", name: "Proyecto uno", createdAt: 1 };
let proyectosMock: Array<typeof proyecto> = [proyecto];
let uploadsMock: unknown[] = [];

vi.mock("../../lib/server/auth", () => ({ getChatGPTUser: async () => usuarioActual }));

vi.mock("../../db", () => ({
  getDb: () => ({
    delete: () => ({ where: () => Promise.resolve() }),
    batch: async () => [...Array.from({ length: 9 }, () => ({})), { meta: { changes: 1 } }],
    insert: () => ({
      values: (values: Record<string, unknown>) => ({
        onConflictDoNothing: () => ({ returning: () => Promise.resolve([{ ...values, createdAt: 1 }]) }),
      }),
    }),
    select: () => {
      const chain = (rows: unknown[]) => {
        const promise = Promise.resolve(rows) as Promise<unknown[]> & { where: () => unknown; orderBy: () => unknown; innerJoin: () => unknown };
        promise.where = () => promise;
        promise.orderBy = () => promise;
        promise.innerJoin = () => promise;
        return promise;
      };
      return { from: (table: object) => chain(table === projectsTable ? proyectosMock : table === uploadsTable ? uploadsMock : [{ value: 1 }]) };
    },
  }),
}));

vi.mock("../../lib/server/project", () => ({
  isOwner: async (user: Usuario) => user.userId === "u-owner",
  isAdministrator: async (user: Usuario) => user.userId === "u-admin",
  PROJECT_FAILURE_RESPONSES: {
    unauthenticated: { status: 401, message: "Inicia sesión para continuar." },
    invalid: { status: 400, message: "Proyecto no válido." },
    not_found: { status: 404, message: "No se encuentra el proyecto." },
    forbidden: { status: 403, message: "No tienes acceso a este proyecto." },
  },
  findProject: async () => null,
  projectAccessForUser: async () => null,
  globalRoleForUser: async () => null,
  memberAccess: async () => null,
  resolveProject: async () => ({ status: "not_found" }),
  projectFailureResponse: (status: "unauthenticated" | "invalid" | "not_found" | "forbidden") =>
    Response.json({ message: status }, { status: 401 }),
}));

import { projects as projectsTable, uploads as uploadsTable } from "../../db/schema";
import { DELETE as eliminarProyectoHttp, POST as crearProyectoHttp } from "./projects/route";
import { registerTools } from "../../lib/server/mcp/registro";

async function llamar(tool: string, user: Usuario, args: Record<string, unknown>) {
  const server = new McpServer({ name: "test", version: "1.0.0" });
  registerTools(server);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const send = clientTransport.send.bind(clientTransport);
  clientTransport.send = (message, options) =>
    send(message, { ...options, authInfo: { token: "ak", clientId: "t1", scopes: [], extra: { userId: user.userId, email: user.email } } });
  const client = new Client({ name: "test", version: "1.0.0" }, { capabilities: {} });
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  try {
    return await client.callTool({ name: tool, arguments: args });
  } finally {
    await client.close();
    await server.close();
  }
}

function alta(name: string) {
  return new Request("https://site.test/api/projects", {
    method: "POST",
    headers: { origin: "https://site.test", "content-type": "application/json" },
    body: JSON.stringify({ id: crypto.randomUUID(), name }),
  });
}

function errorDe(result: Awaited<ReturnType<typeof llamar>>) {
  return (result.structuredContent as { error: { codigo: string; estado: number; mensaje: string } }).error;
}

describe("paridad MCP ↔ HTTP de proyectos", () => {
  it("crear un proyecto coincide por MCP y por la ruta", async () => {
    usuarioActual = identidad.owner;
    const http = await crearProyectoHttp(alta("Proyecto nuevo"));
    expect(http.status).toBe(201);
    const row = (await http.json()) as Record<string, unknown>;
    const mcp = await llamar("crear_proyecto", identidad.owner, { nombre: "Proyecto nuevo" });
    expect(mcp.isError).toBeUndefined();
    const proyecto = (mcp.structuredContent as { proyecto: Record<string, unknown> }).proyecto;
    expect(proyecto).toMatchObject({ nombre: row.name, rol: "owner", creado: true });
    expect(String(proyecto.enlace)).toContain(String(proyecto.id));
  });

  it("la administración también crea y recibe su rol", async () => {
    usuarioActual = identidad.admin;
    const http = await crearProyectoHttp(alta("Proyecto admin"));
    expect(http.status).toBe(201);
    const mcp = await llamar("crear_proyecto", identidad.admin, { nombre: "Proyecto admin" });
    expect(mcp.isError).toBeUndefined();
    expect((mcp.structuredContent as { proyecto: Record<string, unknown> }).proyecto.rol).toBe("admin");
  });

  it("el profesorado no crea proyectos y recibe el mismo 403 por MCP y por la ruta", async () => {
    usuarioActual = identidad.teacher;
    const http = await crearProyectoHttp(alta("Proyecto ajeno"));
    expect(http.status).toBe(403);
    expect(((await http.json()) as { message: string }).message).toBe("Solo el propietario o un administrador pueden crear proyectos.");
    const mcp = await llamar("crear_proyecto", identidad.teacher, { nombre: "Proyecto ajeno" });
    expect(errorDe(mcp)).toEqual({ codigo: "forbidden", estado: 403, mensaje: "Solo el propietario o un administrador pueden crear proyectos." });
  });

  it("el aviso de borrado resume el contenido sin borrar nada", async () => {
    usuarioActual = identidad.owner;
    const mcp = await llamar("eliminar_proyecto", identidad.owner, { proyectoId: proyecto.id });
    expect(mcp.isError).toBeUndefined();
    expect(mcp.structuredContent).toMatchObject({
      necesitaConfirmacion: true,
      herramienta: "eliminar_proyecto",
      proyectoId: proyecto.id,
      nombre: "Proyecto uno",
      resumen: { tareas: 1, fichas: 2, miembros: 1, pizarras: 1, documentos: 1, archivos: 0 },
    });
  });

  it("un nombre que no coincide no borra y devuelve 400", async () => {
    usuarioActual = identidad.owner;
    const mcp = await llamar("eliminar_proyecto", identidad.owner, { proyectoId: proyecto.id, confirmar: true, confirmarNombre: "Otro" });
    expect(errorDe(mcp)).toEqual({ codigo: "invalid", estado: 400, mensaje: "Escribe el nombre exacto del proyecto para confirmar la eliminación." });
  });

  it("un proyecto inexistente responde 404 en el aviso", async () => {
    usuarioActual = identidad.owner;
    proyectosMock = [];
    const mcp = await llamar("eliminar_proyecto", identidad.owner, { proyectoId: "33333333-3333-4333-8333-333333333333" });
    expect(errorDe(mcp)).toEqual({ codigo: "not_found", estado: 404, mensaje: "No se encuentra el proyecto." });
    proyectosMock = [proyecto];
  });

  it("eliminar un proyecto coincide por MCP y por la ruta con el nombre exacto", async () => {
    usuarioActual = identidad.owner;
    const http = await eliminarProyectoHttp(
      new Request("https://site.test/api/projects", {
        method: "DELETE",
        headers: { origin: "https://site.test", "content-type": "application/json" },
        body: JSON.stringify({ id: proyecto.id }),
      }),
    );
    expect(http.status).toBe(200);
    expect(await http.json()).toEqual({ id: proyecto.id, deleted: true });
    const mcp = await llamar("eliminar_proyecto", identidad.owner, { proyectoId: proyecto.id, confirmar: true, confirmarNombre: "Proyecto uno" });
    expect(mcp.isError).toBeUndefined();
    expect(mcp.structuredContent).toEqual({ id: proyecto.id, deleted: true });
  });

  it("si quedan archivos sin limpiar, MCP y ruta devuelven el mismo 503", async () => {
    usuarioActual = identidad.owner;
    uploadsMock = [{ storageKey: "proyecto/archivo" }];
    const http = await eliminarProyectoHttp(
      new Request("https://site.test/api/projects", {
        method: "DELETE",
        headers: { origin: "https://site.test", "content-type": "application/json" },
        body: JSON.stringify({ id: proyecto.id }),
      }),
    );
    expect(http.status).toBe(503);
    const mensaje = "El proyecto se ha eliminado, pero no se han podido limpiar todos sus archivos. Vuelve a intentarlo.";
    expect(((await http.json()) as { message: string }).message).toBe(mensaje);
    const mcp = await llamar("eliminar_proyecto", identidad.owner, { proyectoId: proyecto.id, confirmar: true, confirmarNombre: "Proyecto uno" });
    expect(errorDe(mcp)).toEqual({ codigo: "unavailable", estado: 503, mensaje });
    uploadsMock = [];
  });

  it("el profesorado no elimina proyectos y recibe el mismo 403 por MCP y por la ruta", async () => {
    usuarioActual = identidad.teacher;
    const http = await eliminarProyectoHttp(
      new Request("https://site.test/api/projects", {
        method: "DELETE",
        headers: { origin: "https://site.test", "content-type": "application/json" },
        body: JSON.stringify({ id: proyecto.id }),
      }),
    );
    expect(http.status).toBe(403);
    expect(((await http.json()) as { message: string }).message).toBe("Solo el propietario o un administrador pueden eliminar proyectos.");
    const mcp = await llamar("eliminar_proyecto", identidad.teacher, { proyectoId: proyecto.id, confirmar: true, confirmarNombre: "Proyecto uno" });
    expect(errorDe(mcp)).toEqual({ codigo: "forbidden", estado: 403, mensaje: "Solo el propietario o un administrador pueden eliminar proyectos." });
  });
});
