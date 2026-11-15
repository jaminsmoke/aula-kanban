import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import handler from "vinext/server/fetch-handler";
import { administrators, projectMembers, projects, tasks } from "../db/schema";
import { runWithConnectorBinding } from "../lib/connector-context";
import { BoardRoom } from "../lib/server/board-room";
import { ensureInstanceOwner, isInstanceOwner } from "../lib/server/owner";
import { SpaceRoom } from "../lib/server/space-room";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

export { BoardRoom, SpaceRoom };

/**
 * Comprueba la cuenta de la petición y la delega a la sala de su pizarra.
 * Contrato HTTP del upgrade: 401 sin sesión, 400 parámetros inválidos, 404
 * proyecto, dueño o acceso no disponible y 503 sin bindings. El 404 de acceso
 * evita revelar la existencia de pizarras a cuentas no autorizadas.
 * @param request - Petición de upgrade del socket.
 * @param env - Entorno con los bindings de salas y base de datos.
 * @returns La respuesta del Durable Object o el error HTTP del contrato.
 */
async function boardSocket(request: Request, env: Cloudflare.Env) {
  const userId = request.headers.get("oai-authenticated-user-id");
  const email = request.headers.get("oai-authenticated-user-email") || "";
  if (!userId) return new Response(null, { status: 401 });
  const rooms = env.BOARD_ROOMS;
  if (!rooms || !env.DB) return new Response(null, { status: 503 });
  const url = new URL(request.url);
  const projectId = url.searchParams.get("project") || "default";
  const ownerType = url.searchParams.get("ownerType");
  const ownerId = url.searchParams.get("ownerId");
  if ((ownerType !== "task" && ownerType !== "project" && ownerType !== "space") || !ownerId || projectId.length > 80) return new Response(null, { status: 400 });
  const db = drizzle(env.DB);
  const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId));
  if (!project) return new Response(null, { status: 404 });
  const owner = await ensureInstanceOwner(env.DB, { userId, email }, env.OWNER_EMAIL);
  let allowed = isInstanceOwner(owner, { userId, email });
  if (!allowed) {
    const [admin] = await db.select({ id: administrators.id }).from(administrators).where(eq(administrators.userId, userId));
    allowed = Boolean(admin);
  }
  if (!allowed) {
    const [member] = await db.select({ id: projectMembers.id }).from(projectMembers).where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId), eq(projectMembers.status, "active")));
    allowed = Boolean(member);
  }
  if (!allowed) return new Response(null, { status: 404 });
  if (ownerType === "task") {
    const [task] = await db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.id, ownerId), eq(tasks.projectId, projectId)));
    if (!task) return new Response(null, { status: 404 });
  } else if (ownerId !== projectId) {
    return new Response(null, { status: 404 });
  }
  return rooms.getByName(`${projectId}:${ownerType}:${ownerId}`).fetch(request);
}

/**
 * Escritorio en vivo de Tienda (Fase 2 de MCP-04): valida la cuenta como
 * el socket de pizarras y delega en la sala de su proyecto.
 * Contrato HTTP del upgrade: 401 sin sesión, 400 sin proyecto, 404 proyecto
 * o acceso no disponible y 503 sin bindings.
 * @param request - Petición de upgrade del socket.
 * @param env - Entorno con los bindings de salas y base de datos.
 * @returns La respuesta del Durable Object o el error HTTP del contrato.
 */
async function spaceSocket(request: Request, env: Cloudflare.Env) {
  const userId = request.headers.get("oai-authenticated-user-id");
  const email = request.headers.get("oai-authenticated-user-email") || "";
  if (!userId) return new Response(null, { status: 401 });
  const rooms = env.SPACE_ROOMS;
  if (!rooms || !env.DB) return new Response(null, { status: 503 });
  const projectId = new URL(request.url).searchParams.get("project");
  if (!projectId || projectId.length > 80) return new Response(null, { status: 400 });
  const db = drizzle(env.DB);
  const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId));
  if (!project) return new Response(null, { status: 404 });
  const owner = await ensureInstanceOwner(env.DB, { userId, email }, env.OWNER_EMAIL);
  let allowed = isInstanceOwner(owner, { userId, email });
  if (!allowed) {
    const [admin] = await db.select({ id: administrators.id }).from(administrators).where(eq(administrators.userId, userId));
    allowed = Boolean(admin);
  }
  if (!allowed) {
    const [member] = await db.select({ id: projectMembers.id }).from(projectMembers).where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId), eq(projectMembers.status, "active")));
    allowed = Boolean(member);
  }
  if (!allowed) return new Response(null, { status: 404 });
  return rooms.getByName(projectId).fetch(request);
}

const worker = {
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    if (new URL(request.url).pathname === "/api/board-socket") return boardSocket(request, env);
    if (new URL(request.url).pathname === "/api/space-socket") return spaceSocket(request, env);
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    return runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
  },
};

export default worker;
