import { DurableObject } from "cloudflare:workers";
import { validarVentanas, type AccionVentana, type VentanaEstado } from "../domain/space-windows";

const MAX_MESSAGE_BYTES = 16_384;

type Session = { userId: string; projectId: string };

/**
 * Sala en vivo del escritorio de Mi espacio: un Durable Object **por
 * proyecto** que conecta las pestañas abiertas en `view=espacio` y guarda
 * el estado de sus ventanas **en memoria** (efímero, sin tabla en D1). Las
 * herramientas MCP (`lib/server/space-control.ts`) leen ese estado y le
 * envían comandos por RPC; los clientes los publican y los ejecutan.
 *
 * Se elige este diseño deliberadamente: el escritorio de hoy vive en la
 * memoria de React por pestaña y el resto del equipo no lo ve, así que
 * persistirlo compartido cambiaría el producto. Cada herramienta actúa
 * sobre las pestañas conectadas de la propia cuenta.
 */
export class SpaceRoom extends DurableObject<Cloudflare.Env> {
  private sessions = new Map<WebSocket, Session>();
  private estados = new Map<string, VentanaEstado[]>();

  /**
   * Atiende el upgrade WebSocket de una pestaña del espacio.
   * @param request - Petición de upgrade con la cuenta validada en cabeceras.
   * @returns La respuesta de upgrade o 426 sin WebSocket.
   */
  override async fetch(request: Request) {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("WebSocket requerido", { status: 426 });
    }
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1] as WebSocket;
    this.ctx.acceptWebSocket(server);
    this.sessions.set(server, {
      userId: request.headers.get("oai-authenticated-user-id") || "anon",
      projectId: new URL(request.url).searchParams.get("project") || "default",
    });
    return new Response(null, { status: 101, webSocket: client });
  }

  /**
   * Guarda el estado de ventanas publicado por una pestaña.
   * @param socket - Socket emisor del mensaje.
   * @param message - Mensaje JSON del cliente (`{ type: "estado", ventanas }`).
   */
  override async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== "string" || message.length > MAX_MESSAGE_BYTES) return;
    let data: { type?: string; ventanas?: unknown };
    try {
      data = JSON.parse(message) as { type?: string; ventanas?: unknown };
    } catch {
      return;
    }
    if (data.type !== "estado") return;
    const session = this.sessions.get(socket);
    if (!session) return;
    const ventanas = validarVentanas(data.ventanas);
    if (ventanas) this.estados.set(session.userId, ventanas);
  }

  /**
   * Retira una pestaña de la sala y su estado si era la última.
   * @param socket - Socket que se cerró.
   */
  override webSocketClose(socket: WebSocket) {
    const session = this.sessions.get(socket);
    this.sessions.delete(socket);
    if (session) {
      const sigue = [...this.sessions.values()].some((item) => item.userId === session.userId);
      if (!sigue) this.estados.delete(session.userId);
    }
  }

  /**
   * Retira una pestaña de la sala cuando la conexión falla.
   * @param socket - Socket que falló.
   */
  override webSocketError(socket: WebSocket) {
    this.webSocketClose(socket);
  }

  /**
   * Estado de ventanas de las pestañas conectadas de una cuenta.
   * @param userId - Cuenta cuyas pestañas se consultan.
   * @returns Las ventanas publicadas o `null` si no hay pestaña conectada.
   */
  async estadoDe(userId: string): Promise<VentanaEstado[] | null> {
    return this.estados.get(userId) ?? null;
  }

  /**
   * Envía un comando de ventana a las pestañas conectadas de una cuenta.
   * @param userId - Cuenta destinataria (sus propias pestañas).
   * @param accion - Acción de control (`abrir | cerrar | minimizar | restaurar | ampliar`).
   * @param appId - App sobre la que actúa el comando.
   * @returns `true` si al menos una pestaña lo recibió.
   */
  async comandoA(userId: string, accion: AccionVentana, appId: string): Promise<boolean> {
    let entregado = false;
    const payload = JSON.stringify({ type: "comando", accion, appId });
    for (const [socket, session] of this.sessions) {
      if (session.userId === userId && socket.readyState === 1) {
        socket.send(payload);
        entregado = true;
      }
    }
    return entregado;
  }
}
