import { z } from "zod";
import { findPeriodicElement, type PeriodicElement } from "../../../domain/edu-tools/periodic";
import { errorHerramienta, payloadResult } from "../contexto";
import { resolverAppInstalada } from "./contrato";
import type { McpToolDefinicion } from "../dominios/tipos";

/**
 * Herramientas MCP de Herramientas de aula (MCP-05C).
 *
 * La app no guarda estado de trabajo en el servidor: la calculadora, la
 * memoria, la regla y el lector viven en el navegador. La única superficie
 * estable para MCP es la tabla periódica, que se consulta por símbolo o
 * número atómico y no requiere proyecto.
 */

/**
 * Adapta el elemento al contrato en español de las herramientas MCP.
 * @param element - Elemento del catálogo compartido.
 * @returns La ficha publicada por `consultar_elemento`.
 */
function elementoVista(element: PeriodicElement) {
  return {
    numero: element.number,
    simbolo: element.symbol,
    nombre: element.name,
    nombreIngles: element.englishName,
    masa: element.mass,
    categoria: element.category,
    predicho: element.predicted,
    bloque: element.block,
    grupo: element.group,
    periodo: element.period,
    fase: element.phase,
    configuracionElectronica: element.electronConfiguration,
    electronegatividad: element.electronegativity,
    densidad: element.density,
    fusionK: element.melt,
    ebullicionK: element.boil,
    capas: element.shells,
    descubiertoPor: element.discoveredBy,
    nombradoPor: element.namedBy,
  };
}

/**
 * Consulta un elemento por símbolo o número atómico.
 * @param _caller - Cuenta autenticada (la herramienta no usa proyecto).
 * @param args - `simbolo` o `numero`, exactamente uno.
 * @returns La ficha del elemento o el error del contrato MCP.
 */
async function consultarElemento(_caller: unknown, args: Record<string, unknown>) {
  const a = args as { simbolo?: string; numero?: number };
  if ((a.simbolo === undefined) === (a.numero === undefined)) {
    return errorHerramienta("invalid", "Indica exactamente un símbolo o un número atómico.");
  }

  const app = await resolverAppInstalada("edu-tools");
  if (!app.ok) return app.resultado;

  const element = findPeriodicElement(a);
  if (!element) return errorHerramienta("not_found", "No se encuentra el elemento.");

  return payloadResult({ elemento: elementoVista(element) });
}

/** Herramientas del dominio de apps: Herramientas de aula. */
export const herramientasEduTools: McpToolDefinicion[] = [
  {
    name: "consultar_elemento",
    title: "Consultar elemento",
    description: "Devuelve la ficha de un elemento de la tabla periódica por símbolo o número atómico. Requiere que Herramientas de aula esté instalada; no necesita proyecto.",
    inputSchema: {
      simbolo: z.string().trim().min(1).max(3).optional().describe("Símbolo químico, por ejemplo Na"),
      numero: z.number().int().min(1).max(118).optional().describe("Número atómico, por ejemplo 11"),
    },
    outputSchema: { elemento: z.record(z.unknown()) },
    scope: "mcp:read",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: consultarElemento,
  },
];
