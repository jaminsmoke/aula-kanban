import { describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Paridad MCP ↔ HTTP de administradores (MCP-09, fase 1): la ruta
 * `/api/administrators` y las herramientas comparten
 * `lib/server/administradores.ts`, así que devuelven las mismas fichas y los
 * mismos estados/mensajes para propietario, administración y profesorado.
 */

type Usuario = { userId: string; email: string; displayName: string; fullName: null };
type Rol = "owner" | "admin" | "teacher";
const identidad: Record<Rol, Usuario> = {
  owner: { userId: "u-owner", email: "owner@example.com", displayName: "owner@example.com", fullName: null },
  admin: { userId: "u-admin", email: "admin@example.com", displayName: "admin@example.com", fullName: null },
  teacher: { userId: "u-teacher", email: "teacher@example.com", displayName: "teacher@example.com", fullName: null },
};
let usuarioActual: Usuario = identidad.owner;

type Ficha = {
  id: string;
  email: string | null;
  userId: string | null;
  displayName: string;
  revision: number;
  mutationToken: string | null;
  createdAt: number;
};
const administradorId = "99999999-9999-4999-8999-999999999999";
const ficha = (extra: Partial<Ficha> = {}): Ficha => ({
  id: administradorId,
  email: "admin@example.com",
  userId: "u-admin",
  displayName: "Admin",
  revision: 1,
  mutationToken: null,
  createdAt: 1,
  ...extra,
});
let fichas: Ficha[] = [];

vi.mock("../../../lib/server/auth", () => ({ getChatGPTUser: async () => usuarioActual }));

vi.mock("../../../db", () => ({
  getDb: () => ({
    select: () => {
      const chain = (rows: unknown[]) => {
        const promise = Promise.resolve(rows) as Promise<unknown[]> & { where: () => unknown; orderBy: () => unknown; innerJoin: () => unknown };
        promise.where = () => promise;
        promise.orderBy = () => promise;
        promise.innerJoin = () => promise;
        return promise;
      };
      return { from: (table: object) => chain(table === administratorsTable ? fichas : []) };
    },
    insert: () => ({ values: () => ({ returning: () => Promise.resolve([]) }) }),
    update: () => ({ set: () => ({ where: () => ({ returning: () => Promise.resolve([]) }) }) }),
    delete: () => ({ where: () => Promise.resolve() }),
    batch: async () => [],
  }),
}));

vi.mock("../../../lib/server/project-access", () => ({
  isOwner: async (user: Usuario) => user.userId === "u-owner",
  isAdministrator: async (user: Usuario) => user.userId === "u-admin",
  isOwnerContactEmail: async (email: string) => email.trim().toLowerCase() === "owner@example.com",
  PROJECT_FAILURE_RESPONSES: {
    unauthenticated: { status: 401, message: "Inicia sesión para continuar." },
    invalid: { status: 400, message: "Proyecto no válido." },
    not_found: { status: 404, message: "No se encuentra el proyecto." },
    forbidden: { status: 403, message: "No tienes acceso a este proyecto." },
  },
  projectFailureResponse: (status: keyof typeof import("../../../lib/server/project-http").PROJECT_FAILURE_RESPONSES) =>
    Response.json({ message: status }, { status: 401 }),
  findProject: async () => null,
  projectAccessForUser: async () => null,
  globalRoleForUser: async () => null,
  memberAccess: async () => null,
  resolveProject: async () => ({ status: "not_found" }),
}));

vi.mock("cloudflare:workers", () => ({
  env: {
    DB: {
      prepare: (sql: string) => ({
        bind: (...args: unknown[]) => ({
          all: async () => {
            if (sql.includes("INSERT INTO administrators_unified")) {
              fichas.push(ficha({ id: String(args[0]), email: (args[1] as string) || null, userId: null, displayName: String(args[2]), revision: 1, createdAt: Number(args[3]) }));
              return { results: [{ id: args[0] }] };
            }
            if (sql.includes("UPDATE administrators_unified")) {
              const actual = fichas.find((item) => item.id === args[4]);
              if (!actual || actual.revision !== args[5]) return { results: [] };
              actual.displayName = String(args[0]);
              actual.email = (args[1] as string) || null;
              actual.userId = (args[2] as string) || null;
              actual.mutationToken = String(args[3]);
              actual.revision += 1;
              return { results: [{ id: args[4] }] };
            }
            if (sql.includes("DELETE FROM administrators_unified")) {
              const index = fichas.findIndex((item) => item.id === args[0] && item.revision === args[1]);
              if (index < 0) return { results: [] };
              fichas.splice(index, 1);
              return { results: [{ id: args[0] }] };
            }
            return { results: [] };
          },
        }),
      }),
    },
  },
}));

import { administrators as administratorsTable } from "../../../db/schema";
import { DELETE as eliminarHttp, GET as listarHttp, PATCH as actualizarHttp, POST as crearHttp } from "../administrators/route";
import { registerTools } from "../../../lib/server/mcp/registro";

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

function peticion(method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>) {
  return new Request("https://site.test/api/administrators", {
    method,
    headers: { origin: "https://site.test", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function errorDe(result: Awaited<ReturnType<typeof llamar>>) {
  return (result.structuredContent as { error: { codigo: string; estado: number; mensaje: string } }).error;
}

describe("paridad MCP ↔ HTTP de administradores", () => {
  it("lista las mismas fichas por la ruta y por MCP", async () => {
    fichas = [ficha()];
    usuarioActual = identidad.owner;
    const http = await listarHttp();
    expect(http.status).toBe(200);
    const lista = await http.json();
    const mcp = await llamar("listar_administradores", identidad.owner, {});
    expect(mcp.isError).toBeUndefined();
    expect((mcp.structuredContent as { administradores: unknown }).administradores).toEqual(lista);
  });

  it("el profesorado recibe el mismo 403 por ambas vías", async () => {
    usuarioActual = identidad.teacher;
    const http = await listarHttp();
    expect(http.status).toBe(403);
    const mensaje = ((await http.json()) as { message: string }).message;
    const mcp = await llamar("listar_administradores", identidad.teacher, {});
    expect(errorDe(mcp)).toEqual({ codigo: "forbidden", estado: 403, mensaje });
  });

  it("crea la misma ficha con propietario y con administración", async () => {
    usuarioActual = identidad.owner;
    fichas = [];
    const http = await crearHttp(peticion("POST", { displayName: "Ada", email: "ada@example.com" }));
    expect(http.status).toBe(201);
    const creada = (await http.json()) as Record<string, unknown>;

    fichas = [];
    const mcp = await llamar("crear_administrador", identidad.admin, { nombre: "Ada", correo: "ada@example.com" });
    expect(mcp.isError).toBeUndefined();
    const porMcp = (mcp.structuredContent as { administrador: Record<string, unknown> }).administrador;
    expect(porMcp).toMatchObject({
      displayName: creada.displayName,
      email: creada.email,
      revision: creada.revision,
      accountStatus: creada.accountStatus,
      active: creada.active,
    });
  });

  it("el correo del propietario da el mismo 400 por ambas vías", async () => {
    usuarioActual = identidad.owner;
    const http = await crearHttp(peticion("POST", { displayName: "Owner", email: "owner@example.com" }));
    expect(http.status).toBe(400);
    const mensaje = ((await http.json()) as { message: string }).message;
    const mcp = await llamar("crear_administrador", identidad.owner, { nombre: "Owner", correo: "owner@example.com" });
    expect(errorDe(mcp)).toEqual({ codigo: "invalid", estado: 400, mensaje });
  });

  it("actualiza conservando el userId cuando el correo no cambia", async () => {
    usuarioActual = identidad.owner;
    fichas = [ficha()];
    const http = await actualizarHttp(peticion("PATCH", { id: administradorId, revision: 1, displayName: "Admin 2", email: "admin@example.com" }));
    expect(http.status).toBe(200);
    const actualizada = (await http.json()) as Record<string, unknown>;
    expect(actualizada).toMatchObject({ displayName: "Admin 2", accountStatus: "active", active: true, revision: 2 });

    fichas = [ficha()];
    const mcp = await llamar("actualizar_administrador", identidad.owner, { administradorId, revision: 1, nombre: "Admin 2", correo: "admin@example.com" });
    expect(mcp.isError).toBeUndefined();
    expect((mcp.structuredContent as { administrador: Record<string, unknown> }).administrador).toMatchObject({
      displayName: "Admin 2",
      accountStatus: "active",
      active: true,
      revision: 2,
    });
  });

  it("una ficha inexistente da el mismo 404 por ambas vías", async () => {
    usuarioActual = identidad.owner;
    fichas = [];
    const http = await actualizarHttp(peticion("PATCH", { id: administradorId, revision: 1, displayName: "Admin 2" }));
    expect(http.status).toBe(404);
    const mensaje = ((await http.json()) as { message: string }).message;
    const mcp = await llamar("actualizar_administrador", identidad.owner, { administradorId, revision: 1, nombre: "Admin 2" });
    expect(errorDe(mcp)).toEqual({ codigo: "not_found", estado: 404, mensaje });
  });

  it("una revisión vieja da el mismo 409 por ambas vías", async () => {
    usuarioActual = identidad.owner;
    fichas = [ficha({ revision: 2 })];
    const http = await actualizarHttp(peticion("PATCH", { id: administradorId, revision: 1, displayName: "Admin 2" }));
    expect(http.status).toBe(409);
    const mensaje = ((await http.json()) as { message: string }).message;
    const mcp = await llamar("actualizar_administrador", identidad.owner, { administradorId, revision: 1, nombre: "Admin 2" });
    expect(errorDe(mcp)).toEqual({ codigo: "conflict", estado: 409, mensaje });
  });

  it("sin confirmación no elimina y exige el nombre exacto", async () => {
    usuarioActual = identidad.owner;
    fichas = [ficha()];
    const aviso = await llamar("eliminar_administrador", identidad.owner, { administradorId, revision: 1 });
    expect(aviso.isError).toBeUndefined();
    expect(aviso.structuredContent).toMatchObject({ necesitaConfirmacion: true, herramienta: "eliminar_administrador", nombre: "Admin", correo: "admin@example.com", revision: 1 });
    expect(fichas).toHaveLength(1);

    const incorrecto = await llamar("eliminar_administrador", identidad.owner, { administradorId, revision: 1, confirmar: true, confirmarNombre: "Otro" });
    expect(errorDe(incorrecto)).toEqual({ codigo: "invalid", estado: 400, mensaje: "Escribe el nombre o el correo exacto de la ficha para confirmar la baja." });
    expect(fichas).toHaveLength(1);
  });

  it("elimina la misma ficha por la ruta y por MCP", async () => {
    usuarioActual = identidad.owner;
    fichas = [ficha()];
    const http = await eliminarHttp(peticion("DELETE", { id: administradorId, revision: 1 }));
    expect(http.status).toBe(200);
    expect(await http.json()).toEqual({ id: administradorId });
    expect(fichas).toHaveLength(0);

    fichas = [ficha()];
    const mcp = await llamar("eliminar_administrador", identidad.owner, { administradorId, revision: 1, confirmar: true, confirmarNombre: "admin@example.com" });
    expect(mcp.isError).toBeUndefined();
    expect(mcp.structuredContent).toEqual({ eliminado: administradorId, nombre: "Admin" });
    expect(fichas).toHaveLength(0);
  });

  it("una baja con revisión vieja da el mismo 409 por ambas vías", async () => {
    usuarioActual = identidad.owner;
    fichas = [ficha({ revision: 2 })];
    const http = await eliminarHttp(peticion("DELETE", { id: administradorId, revision: 1 }));
    expect(http.status).toBe(409);
    const mensaje = ((await http.json()) as { message: string }).message;
    const mcp = await llamar("eliminar_administrador", identidad.owner, { administradorId, revision: 1, confirmar: true, confirmarNombre: "Admin" });
    expect(errorDe(mcp)).toEqual({ codigo: "conflict", estado: 409, mensaje });
  });

  it("el profesorado no crea, edita ni elimina por ninguna de las dos vías", async () => {
    usuarioActual = identidad.teacher;
    const httpCrear = await crearHttp(peticion("POST", { displayName: "Ada", email: "ada@example.com" }));
    expect(httpCrear.status).toBe(403);
    const mensaje = ((await httpCrear.json()) as { message: string }).message;
    const mcpCrear = await llamar("crear_administrador", identidad.teacher, { nombre: "Ada", correo: "ada@example.com" });
    expect(errorDe(mcpCrear)).toEqual({ codigo: "forbidden", estado: 403, mensaje });

    const httpEditar = await actualizarHttp(peticion("PATCH", { id: administradorId, revision: 1, displayName: "Admin 2" }));
    expect(httpEditar.status).toBe(403);
    const mcpEditar = await llamar("actualizar_administrador", identidad.teacher, { administradorId, revision: 1, nombre: "Admin 2" });
    expect(errorDe(mcpEditar)).toEqual({ codigo: "forbidden", estado: 403, mensaje });

    const httpEliminar = await eliminarHttp(peticion("DELETE", { id: administradorId, revision: 1 }));
    expect(httpEliminar.status).toBe(403);
    const mcpEliminar = await llamar("eliminar_administrador", identidad.teacher, { administradorId, revision: 1, confirmar: true, confirmarNombre: "Admin" });
    expect(errorDe(mcpEliminar)).toEqual({ codigo: "forbidden", estado: 403, mensaje });
  });
});
