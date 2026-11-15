import { nativeAppMeta, type NativeAppMeta } from "../../../native-apps";
import { listInstalledApps } from "../../apps";
import { errorHerramienta, falloResolucion, resolve, toChatGPTUser, type McpCaller, type ToolResult } from "../contexto";
import type { Access, ProjectRow } from "../../project-access";

/**
 * Contrato común de las herramientas MCP de apps nativas (MCP-05A).
 *
 * Las herramientas de app no viven en `app/board/apps/`: `lib` no puede
 * importar desde `app`. Este módulo resuelve la instalación y, cuando la
 * herramienta necesita un proyecto, el acceso de la cuenta con el mismo
 * contrato de errores que el resto del servidor MCP.
 */

/** La app no pertenece al catálogo nativo. */
export const APP_NO_EXISTE = "La aplicación no existe.";
/** La app existe, pero no está instalada en la instancia. */
export const APP_NO_INSTALADA = "La aplicación no está instalada";
/** Mensaje compartido con las mutaciones de documentos de app. */
export const APP_INVITADO_SIN_ESCRITURA = "Las cuentas invitadas solo pueden consultar el proyecto.";

type AppFallida = { ok: false; resultado: ToolResult };
/** App nativa instalada, sin proyecto asociado. */
export type AppInstalada = { ok: true; app: NativeAppMeta };
/** App nativa instalada con el proyecto y el acceso ya resueltos. */
export type AppEnProyecto = { ok: true; app: NativeAppMeta; project: ProjectRow; access: Access };

/**
 * Comprueba que la app existe y está instalada en la instancia.
 * @param appId - Identificador de la app del catálogo.
 * @returns La ficha de la app o el error del contrato MCP.
 */
export async function resolverAppInstalada(appId: string): Promise<AppInstalada | AppFallida> {
  const app = nativeAppMeta(appId);
  if (!app) return { ok: false, resultado: errorHerramienta("not_found", APP_NO_EXISTE) };

  const instalada = (await listInstalledApps()).some(
    (estado) => estado.id === app.id && estado.status === "installed",
  );
  if (!instalada) return { ok: false, resultado: errorHerramienta("not_found", APP_NO_INSTALADA) };

  return { ok: true, app };
}

/**
 * Resuelve proyecto y acceso y comprueba después que la app está instalada.
 * El orden evita revelar la instalación a una cuenta sin acceso al proyecto.
 * @param caller - Cuenta identificada por el token.
 * @param input - Proyecto, app y si la operación escribe.
 * @returns Proyecto, acceso y app, o el error del contrato MCP.
 */
export async function resolverAppEnProyecto(
  caller: McpCaller,
  input: { proyectoId: string; appId: string; escritura?: boolean },
): Promise<AppEnProyecto | AppFallida> {
  const resolved = await resolve(toChatGPTUser(caller), input.proyectoId);
  if (!resolved.ok) return { ok: false, resultado: falloResolucion(resolved) };

  const app = await resolverAppInstalada(input.appId);
  if (!app.ok) return app;

  if (input.escritura && resolved.access.role === "guest") {
    return { ok: false, resultado: errorHerramienta("forbidden", APP_INVITADO_SIN_ESCRITURA) };
  }

  return { ok: true, app: app.app, project: resolved.project, access: resolved.access };
}
