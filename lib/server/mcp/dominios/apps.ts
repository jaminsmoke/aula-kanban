import { z } from "zod";
import { AULA_STORE_VERSION, NATIVE_APP_IDS, NATIVE_APPS, nativeAppMeta, type NativeAppId, type NativeAppMeta } from "../../../native-apps";
import { listInstalledApps, setAppInstalled, MANAGE_APPS_FORBIDDEN, type AppInstalledState } from "../../apps";
import { isAdministrator, isOwner } from "../../project-access";
import { errorHerramienta, falloResolucion, payloadResult, resolve, toChatGPTUser, type McpCaller } from "../contexto";
import type { McpToolDefinicion } from "./tipos";

/**
 * Dominio de Aula Store (MCP-03): catálogo, ficha e instalación de apps de
 * Mi espacio. La instalación es de la instancia y solo la pueden gestionar
 * el propietario o un administrador, igual que la web.
 */

const appIdSchema = z.enum(NATIVE_APP_IDS as unknown as [string, ...string[]]).describe("Id de la app del catálogo");

/** Vista de una app del catálogo con su estado de instalación. */
type AppView = {
  id: string;
  nombre: string;
  categoria: string;
  tagline: string;
  appVersion: string;
  paquete: string;
  versionPaquete: string;
  estado: string;
  versionInstalada: string | null;
};

/**
 * Vista de catálogo de una app.
 * @param meta - Ficha del catálogo.
 * @param estado - Estado de instalación.
 * @returns La entrada para `listar_apps`.
 */
function vista(meta: NativeAppMeta, estado: AppInstalledState): AppView {
  return {
    id: meta.id,
    nombre: meta.name,
    categoria: meta.category,
    tagline: meta.tagline,
    appVersion: meta.appVersion,
    paquete: meta.upstream.name,
    versionPaquete: meta.upstream.version,
    estado: estado.status,
    versionInstalada: estado.version,
  };
}

/**
 * Comprueba que la cuenta puede gestionar aplicaciones de la instancia.
 * @param caller - Cuenta identificada por el token.
 * @returns `true` si es propietaria o administradora.
 */
async function puedeGestionar(caller: McpCaller): Promise<boolean> {
  const user = toChatGPTUser(caller);
  return (await isOwner(user)) || (await isAdministrator(user));
}

function gestionarForbidido() {
  return errorHerramienta("forbidden", MANAGE_APPS_FORBIDDEN);
}

async function listarApps(caller: McpCaller, args: Record<string, unknown>) {
  const { proyectoId } = args as { proyectoId?: string };
  if (proyectoId) {
    const resolved = await resolve(toChatGPTUser(caller), proyectoId);
    if (!resolved.ok) return falloResolucion(resolved);
  }
  const estados = await listInstalledApps();
  const apps = NATIVE_APPS.map((meta) => vista(meta, estados.find((estado) => estado.id === meta.id) ?? { id: meta.id, status: "not_installed", version: null }));
  return payloadResult({ apps });
}

async function obtenerApp(caller: McpCaller, args: Record<string, unknown>) {
  const { appId } = args as { appId: string };
  const meta = nativeAppMeta(appId);
  if (!meta) return errorHerramienta("not_found", "La aplicación no existe.");
  const estados = await listInstalledApps();
  const estado = estados.find((item) => item.id === meta.id) ?? { id: meta.id, status: "not_installed" as const, version: null };
  return payloadResult({
    app: {
      ...vista(meta, estado),
      descripcion: meta.description,
      cover: meta.cover,
      features: [...meta.features],
      versionLabel: meta.versionLabel ?? null,
      extras: (meta.extras ?? []).map((extra) => ({ nombre: extra.name, version: extra.version })),
      ventana: meta.window,
      versionAulaStore: AULA_STORE_VERSION,
    },
  });
}

async function instalarApp(caller: McpCaller, args: Record<string, unknown>) {
  const { appId } = args as { appId: string };
  if (!(await puedeGestionar(caller))) return gestionarForbidido();
  const estado = await setAppInstalled(caller.userId, appId as NativeAppId, true);
  return payloadResult({ app: vista(nativeAppMeta(appId)!, estado) });
}

async function desinstalarApp(caller: McpCaller, args: Record<string, unknown>) {
  const a = args as { appId: string; confirmar?: boolean };
  if (!(await puedeGestionar(caller))) return gestionarForbidido();
  const meta = nativeAppMeta(a.appId);
  if (!meta) return errorHerramienta("not_found", "La aplicación no existe.");
  if (a.confirmar !== true) {
    return payloadResult({
      necesitaConfirmacion: true,
      herramienta: "desinstalar_app",
      appId: a.appId,
      nombre: meta.name,
      mensaje: `${meta.name} desaparecerá de Mi espacio para todos los miembros. Los documentos guardados se conservan. Llama de nuevo con confirmar: true para continuar.`,
    });
  }
  const estado = await setAppInstalled(caller.userId, a.appId as NativeAppId, false);
  return payloadResult({ app: vista(meta, estado) });
}

/** Herramientas del dominio de Aula Store. */
export const herramientasApps: McpToolDefinicion[] = [
  {
    name: "listar_apps",
    title: "Listar apps",
    description: "Lista el catálogo de Aula Store con su estado de instalación en la instancia. Con `proyectoId` exige acceso a ese proyecto; sin él basta estar autenticado.",
    inputSchema: {
      proyectoId: z.string().uuid().optional().describe("Id del proyecto (verifica el acceso)"),
    },
    outputSchema: { apps: z.array(z.record(z.unknown())) },
    scope: "mcp:read",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: listarApps,
  },
  {
    name: "obtener_app",
    title: "Obtener app",
    description: "Devuelve la ficha completa de la tienda de una app del catálogo.",
    inputSchema: { appId: appIdSchema },
    outputSchema: { app: z.record(z.unknown()) },
    scope: "mcp:read",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: obtenerApp,
  },
  {
    name: "instalar_app",
    title: "Instalar app",
    description: "Instala una app en toda la instancia (idempotente). Solo el propietario o un administrador; el resto recibe 403.",
    inputSchema: { appId: appIdSchema },
    outputSchema: { app: z.record(z.unknown()) },
    scope: "mcp:write",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: instalarApp,
  },
  {
    name: "desinstalar_app",
    title: "Desinstalar app",
    description: "Desinstala una app de toda la instancia. Destructiva para el escritorio: sin `confirmar: true` avisa primero. Solo el propietario o un administrador; el resto recibe 403. Los documentos guardados se conservan.",
    inputSchema: {
      appId: appIdSchema,
      confirmar: z.boolean().optional().describe("Llama con true para desinstalar tras ver el aviso"),
    },
    outputSchema: {
      app: z.record(z.unknown()).optional(),
      necesitaConfirmacion: z.boolean().optional(),
      herramienta: z.string().optional(),
      appId: z.string().optional(),
      nombre: z.string().optional(),
      mensaje: z.string().optional(),
    },
    scope: "mcp:write",
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    handler: desinstalarApp,
  },
];
