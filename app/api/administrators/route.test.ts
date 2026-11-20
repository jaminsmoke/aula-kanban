import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatGPTUser } from "../../../lib/server/access/auth";

/**
 * Contrato HTTP de `/api/administrators` (MCP-09): la ruta es una envoltura de
 * la lógica compartida y conserva estados, mensajes y revisión. Estas pruebas
 * cubren lectura, alta, edición y baja sin pasar por MCP.
 */

type Ficha = {
  id: string;
  email: string | null;
  userId: string | null;
  displayName: string;
  revision: number;
  mutationToken: string | null;
  createdAt: number;
};

const mocks = vi.hoisted(() => ({
  user: null as ChatGPTUser | null,
  rows: [] as Ficha[],
  failInsert: false,
}));

vi.mock("../../../lib/server/access/auth", () => ({ getChatGPTUser: async () => mocks.user }));

vi.mock("../../../db", () => ({
  getDb: () => ({
    select: () => {
      const chain = (rows: unknown[]) => {
        const promise = Promise.resolve(rows) as Promise<unknown[]> & { where: () => unknown; orderBy: () => unknown };
        promise.where = () => promise;
        promise.orderBy = () => promise;
        return promise;
      };
      return { from: () => chain(mocks.rows) };
    },
  }),
}));

vi.mock("../../../lib/server/projects/project-access", () => ({
  isOwner: async (user: ChatGPTUser) => user.userId === "u-owner",
  isAdministrator: async (user: ChatGPTUser) => user.userId === "u-admin",
  isOwnerContactEmail: async (email: string) => email.trim().toLowerCase() === "owner@example.com",
  projectFailureResponse: () => Response.json({ message: "Inicia sesión para continuar." }, { status: 401 }),
}));

vi.mock("cloudflare:workers", () => ({
  env: {
    DB: {
      prepare: (sql: string) => ({
        bind: (...args: unknown[]) => ({
          all: async () => {
            if (sql.includes("INSERT INTO administrators_unified")) {
              if (mocks.failInsert) throw new Error("duplicado");
              mocks.rows.push({
                id: String(args[0]),
                email: (args[1] as string) || null,
                userId: null,
                displayName: String(args[2]),
                revision: 1,
                mutationToken: null,
                createdAt: Number(args[3]),
              });
              return { results: [{ id: args[0] }] };
            }
            if (sql.includes("UPDATE administrators_unified")) {
              const actual = mocks.rows.find((row) => row.id === args[4]);
              if (!actual || actual.revision !== args[5]) return { results: [] };
              actual.displayName = String(args[0]);
              actual.email = (args[1] as string) || null;
              actual.userId = (args[2] as string) || null;
              actual.mutationToken = String(args[3]);
              actual.revision += 1;
              return { results: [{ id: args[4] }] };
            }
            if (sql.includes("DELETE FROM administrators_unified")) {
              const index = mocks.rows.findIndex((row) => row.id === args[0] && row.revision === args[1]);
              if (index < 0) return { results: [] };
              mocks.rows.splice(index, 1);
              return { results: [{ id: args[0] }] };
            }
            return { results: [] };
          },
        }),
      }),
    },
  },
}));

import { DELETE, GET, PATCH, POST } from "./route";

const administradorId = "99999999-9999-4999-8999-999999999999";
const owner: ChatGPTUser = { userId: "u-owner", email: "owner@example.com", displayName: "Owner", fullName: null };
const teacher: ChatGPTUser = { userId: "u-teacher", email: "teacher@example.com", displayName: "Teacher", fullName: null };
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

function request(method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return new Request("https://site.test/api/administrators", {
    method,
    headers: { origin: "https://site.test", "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("ruta HTTP de administradores", () => {
  beforeEach(() => {
    mocks.user = owner;
    mocks.rows = [];
    mocks.failInsert = false;
  });

  it("exige sesión y permiso global para leer", async () => {
    mocks.user = null;
    expect((await GET()).status).toBe(401);
    mocks.user = teacher;
    const forbidden = await GET();
    expect(forbidden.status).toBe(403);
    expect(((await forbidden.json()) as { message: string }).message).toBe("Solo el propietario o un administrador pueden gestionar administradores.");
  });

  it("resuelve el 403 antes de validar el cuerpo", async () => {
    mocks.user = teacher;
    expect((await POST(request("POST", {}))).status).toBe(403);
    expect((await PATCH(request("PATCH", {}))).status).toBe(403);
    expect((await DELETE(request("DELETE", {}))).status).toBe(403);
  });

  it("lista las fichas con su estado de cuenta y sin datos internos", async () => {
    mocks.rows = [ficha()];
    const respuesta = await GET();
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual([{ id: administradorId, displayName: "Admin", email: "admin@example.com", revision: 1, accountStatus: "active", active: true }]);
  });

  it("valida origen, formato, campos y correo del propietario en el alta", async () => {
    expect((await POST(request("POST", { displayName: "Ada" }, { origin: "https://otro.test" }))).status).toBe(403);
    expect((await POST(request("POST", { displayName: "Ada" }, { "content-type": "text/plain" }))).status).toBe(415);
    expect((await POST(request("POST", { displayName: "Ada", email: "no-es-correo" }))).status).toBe(400);
    const ownerEmail = await POST(request("POST", { displayName: "Owner", email: "owner@example.com" }));
    expect(ownerEmail.status).toBe(400);
    expect(((await ownerEmail.json()) as { message: string }).message).toBe("La cuenta propietaria ya es administradora.");
  });

  it("crea una ficha pendiente y devuelve 409 si el correo está duplicado", async () => {
    const creada = await POST(request("POST", { displayName: "Ada", email: "ada@example.com" }));
    expect(creada.status).toBe(201);
    expect(await creada.json()).toMatchObject({ displayName: "Ada", email: "ada@example.com", revision: 1, accountStatus: "pending", active: false });
    expect(mocks.rows).toHaveLength(1);

    mocks.failInsert = true;
    const duplicada = await POST(request("POST", { displayName: "Otra", email: "ada@example.com" }));
    expect(duplicada.status).toBe(409);
    expect(((await duplicada.json()) as { message: string }).message).toContain("No se pudo crear la ficha");
  });

  it("edita con revisión, conserva la cuenta si el correo no cambia y la retira si cambia", async () => {
    mocks.rows = [ficha()];
    const mismoCorreo = await PATCH(request("PATCH", { id: administradorId, revision: 1, displayName: "Admin 2", email: "admin@example.com" }));
    expect(mismoCorreo.status).toBe(200);
    expect(await mismoCorreo.json()).toMatchObject({ displayName: "Admin 2", accountStatus: "active", revision: 2 });
    expect(mocks.rows[0].userId).toBe("u-admin");

    mocks.rows = [ficha()];
    const otroCorreo = await PATCH(request("PATCH", { id: administradorId, revision: 1, email: "nuevo@example.com" }));
    expect(otroCorreo.status).toBe(200);
    expect(await otroCorreo.json()).toMatchObject({ email: "nuevo@example.com", accountStatus: "pending", active: false });
    expect(mocks.rows[0].userId).toBeNull();
  });

  it("responde 404 y 409 en edición y baja", async () => {
    expect((await PATCH(request("PATCH", { id: administradorId, revision: 1, displayName: "X" }))).status).toBe(404);

    mocks.rows = [ficha({ revision: 2 })];
    expect((await PATCH(request("PATCH", { id: administradorId, revision: 1, displayName: "X" }))).status).toBe(409);
    expect((await DELETE(request("DELETE", { id: administradorId, revision: 1 }))).status).toBe(409);

    mocks.rows = [];
    expect((await DELETE(request("DELETE", { id: administradorId, revision: 1 }))).status).toBe(404);
  });

  it("elimina una ficha con su revisión", async () => {
    mocks.rows = [ficha()];
    const respuesta = await DELETE(request("DELETE", { id: administradorId, revision: 1 }));
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ id: administradorId });
    expect(mocks.rows).toHaveLength(0);
  });
});
