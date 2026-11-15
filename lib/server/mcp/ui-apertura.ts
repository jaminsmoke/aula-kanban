import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Recurso `ui://` para abrir apps dentro del chat (Fase 3 de MCP-04, SEP-1865
 * «MCP Apps»). La herramienta `abrir_app` de Aula Kanban declara este recurso
 * en su `_meta.ui.resourceUri`: el host (ChatGPT, que implementa el estándar)
 * lo lee con `resources/read` y lo renderiza en un iframe sandbox dentro de la
 * conversación. La mini-app escucha el puente `ui/*` para responder al
 * `ui/initialize` y para recibir el resultado de la herramienta, del que
 * muestra el nombre de la app y el enlace de apertura.
 *
 * Se implementa sin `@modelcontextprotocol/ext-apps` (exige SDK v2): el
 * protocolo son dos registros (`_meta.ui.resourceUri` en la herramienta y el
 * recurso `ui://`) que el SDK 1.x ya sabe servir.
 */

/** URI del recurso de apertura de Aula Kanban dentro del chat. */
export const UI_APERTURA_URI = "ui://aula-espacio/apertura";

/** Mime type de los recursos UI de MCP Apps. */
export const UI_MIME_TYPE = "text/html;profile=mcp-app";

/**
 * Entrada de `resources/list` para la puerta del plugin (JSON-RPC propio).
 * @returns La lista con el único recurso UI de Aula Kanban.
 */
export function listarRecursosUi() {
  return [
    {
      uri: UI_APERTURA_URI,
      name: "apertura-espacio",
      mimeType: UI_MIME_TYPE,
      title: "Aula Kanban — Tienda",
      description: "Abrir una app de Tienda dentro del chat.",
    },
  ];
}

/**
 * Contenido de `resources/read` para la puerta del plugin.
 * @param uri - URI pedida por el host.
 * @returns El contenido del recurso o `null` si la URI no es la UI de apertura.
 */
export function leerRecursoUi(uri: string) {
  if (uri !== UI_APERTURA_URI) return null;
  return { uri, mimeType: UI_MIME_TYPE, text: UI_APERTURA_HTML };
}

/**
 * Registra el recurso UI en el servidor MCP del SDK (`/api/mcp`).
 * @param server - Servidor MCP en el que registrarlo.
 */
export function registrarRecursosUi(server: McpServer) {
  server.registerResource(
    "apertura-espacio",
    UI_APERTURA_URI,
    { title: "Aula Kanban — Tienda", description: "Abrir una app de Tienda dentro del chat.", mimeType: UI_MIME_TYPE },
    async () => ({ contents: [{ uri: UI_APERTURA_URI, mimeType: UI_MIME_TYPE, text: UI_APERTURA_HTML }] }),
  );
}

/** Mini-app del recurso: enlace de apertura + listado de apps por el puente. */
export const UI_APERTURA_HTML = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { font-family: system-ui, sans-serif; margin: 0; padding: 16px; color: #1f2937; }
  h1 { font-size: 17px; margin: 0 0 4px; }
  p { font-size: 13px; color: #6b7280; margin: 4px 0 12px; }
  a.boton { display: inline-block; background: #2563eb; color: #fff; padding: 8px 14px; border-radius: 8px; text-decoration: none; font-size: 13px; }
  a.boton[hidden] { display: none; }
  ul { list-style: none; padding: 0; margin: 12px 0 0; }
  li { font-size: 13px; padding: 4px 0; border-top: 1px solid #e5e7eb; }
  .meta { font-size: 11px; color: #9ca3af; }
</style>
</head>
<body>
  <h1>Aula Kanban · Tienda</h1>
  <p id="aviso">Abre una app de Tienda para trabajar en ella.</p>
  <a id="abrir" class="boton" hidden target="_blank" rel="noopener">Abrir en Aula Kanban</a>
  <button id="listar" class="boton" style="background:#374151">Listar apps</button>
  <ul id="apps"></ul>
  <p class="meta" id="estado"></p>
<script>
(function () {
  var parent = window.parent;
  var enlace = document.getElementById("abrir");
  var aviso = document.getElementById("aviso");
  var lista = document.getElementById("apps");
  var estado = document.getElementById("estado");

  function aplicarResultado(datos) {
    if (datos && typeof datos.enlace === "string") {
      enlace.href = datos.enlace;
      enlace.hidden = false;
      aviso.textContent = "App lista para abrir en el Site.";
    }
    if (datos && typeof datos.appId === "string") {
      aviso.textContent = "App: " + datos.appId + ".";
    }
  }

  function pedirListado() {
    estado.textContent = "Pidiendo apps…";
    parent.postMessage({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "listar_apps", arguments: {} } }, "*");
  }

  function responderListado(resultado) {
    var datos = resultado && (resultado.structuredContent || resultado.structuredContent === undefined ? resultado : null);
    var apps = datos && datos.apps;
    if (!apps || !apps.length) { estado.textContent = "Sin respuesta de apps."; return; }
    lista.innerHTML = "";
    apps.forEach(function (app) {
      var li = document.createElement("li");
      li.textContent = (app.nombre || app.id || "App") + (app.estado === "installed" ? " · instalada" : " · no instalada");
      lista.appendChild(li);
    });
    estado.textContent = "";
  }

  window.addEventListener("message", function (event) {
    if (event.source !== parent) return;
    var msg = event.data;
    if (!msg || typeof msg !== "object" || msg.jsonrpc !== "2.0") return;
    if (msg.method === "ui/initialize") {
      var version = (msg.params && msg.params.protocolVersion) || "2025-06-18";
      parent.postMessage({ jsonrpc: "2.0", id: msg.id, result: { protocolVersion: version, capabilities: {} } }, "*");
    } else if (msg.method === "ui/notifications/tool-result") {
      var params = msg.params || {};
      aplicarResultado(params.structuredContent || {});
      if (params.structuredContent && params.structuredContent.apps) responderListado(params);
    } else if (msg.method === "ui/notifications/tool-input") {
      aplicarResultado(msg.params || {});
    } else if (msg.id === 1 && msg.result) {
      responderListado(msg.result);
    }
  });

  document.getElementById("listar").addEventListener("click", pedirListado);
  if (window.openai && window.openai.toolOutput) aplicarResultado(window.openai.toolOutput);
})();
</script>
</body>
</html>`;
