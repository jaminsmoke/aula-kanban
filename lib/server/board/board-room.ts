import { DurableObject } from "cloudflare:workers";
import { MAX_BOARD_LIVE_BYTES } from "../../domain/boards/excalidraw-elements";
import { ensureInstanceOwner, isInstanceOwner } from "../access/owner";

type Session = { userId: string; email: string; projectId: string; ownerType: string; ownerId: string };
type IncomingMessage = { type?: string; snapshot?: string; pointer?: unknown };

/**
 * Sala en vivo de una pizarra: un Durable Object por pizarra que reenvía escenas y presencia
 * entre quien edita y quien la mira. La persistencia vive en D1 vía la API REST; aquí solo
 * se guarda la última escena en memoria para entregar a quien se conecte.
 */
export class BoardRoom extends DurableObject<Cloudflare.Env> {
  private lastScene: string | null = null;
  private sessions = new Map<WebSocket, Session>();

  /**
   * Atiende la conexión WebSocket de un participante y le entrega la escena actual.
   * @param request - Petición de upgrade con las cabeceras de la cuenta ya validadas.
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
      email: request.headers.get("oai-authenticated-user-email") || "",
      projectId: new URL(request.url).searchParams.get("project") || "default",
      ownerType: new URL(request.url).searchParams.get("ownerType") || "",
      ownerId: new URL(request.url).searchParams.get("ownerId") || "",
    });
    if (this.lastScene) server.send(JSON.stringify({ type: "scene", snapshot: this.lastScene }));
    return new Response(null, { status: 101, webSocket: client });
  }

  /**
   * Publica una escena ya guardada en todas las pestañas conectadas. Es una
   * llamada RPC del servidor, no un mensaje de cliente: no escribe en D1 y no
   * sustituye al guardado. Si la escena supera 1 MB no se envía y la web la
   * recogerá por el sondeo habitual.
   * @param snapshot - Snapshot serializado que ya se guardó.
   * @param revision - Revisión guardada, para que el cliente pueda ordenar escenas.
   * @returns `true` si al menos una pestaña recibió la escena.
   */
  async publicarEscena(snapshot: string, revision: number): Promise<boolean> {
    if (snapshot.length > MAX_BOARD_LIVE_BYTES) return false;
    this.lastScene = snapshot;
    const payload = JSON.stringify({ type: "scene", snapshot, revision });
    let entregada = false;
    for (const socket of this.ctx.getWebSockets()) {
      if (socket.readyState !== 1) continue;
      try {
        socket.send(payload);
        entregada = true;
      } catch {
        // Un socket que falla no debe tumbar la publicación al resto.
      }
    }
    return entregada;
  }

  /**
   * Reenvía la escena o la presencia de un participante al resto de la sala.
   * @param socket - Socket emisor del mensaje.
   * @param message - Mensaje JSON del cliente (`scene` o `presence`).
   */
  override async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== "string" || message.length > MAX_BOARD_LIVE_BYTES) return;
    let data: IncomingMessage;
    try {
      data = JSON.parse(message) as IncomingMessage;
    } catch {
      return;
    }
    const session = this.sessions.get(socket);
    if (!session || !await this.allowed(session, false)) { socket.close(1008, "Acceso retirado"); return; }
    if (data.type === "scene" && typeof data.snapshot === "string" && data.snapshot.length <= MAX_BOARD_LIVE_BYTES) {
      if (!await this.allowed(session, true)) return;
      this.lastScene = data.snapshot;
      await this.broadcast(socket, JSON.stringify({ type: "scene", snapshot: data.snapshot }));
    } else if (data.type === "presence") {
      await this.broadcast(socket, JSON.stringify({ type: "presence", userId: session.userId, email: session.email, pointer: data.pointer ?? null }));
    }
  }

  /**
   * Retira un participante de la sala y avisa al resto.
   * @param socket - Socket que se cerró.
   */
  override webSocketClose(socket: WebSocket) {
    const session = this.sessions.get(socket);
    this.sessions.delete(socket);
    if (session) void this.broadcast(socket, JSON.stringify({ type: "leave", userId: session.userId }));
  }

  /**
   * Retira un participante de la sala cuando la conexión falla.
   * @param socket - Socket que falló.
   */
  override webSocketError(socket: WebSocket) {
    this.webSocketClose(socket);
  }

  /**
   * Envía un mensaje a todos los participantes salvo el emisor.
   * @param exclude - Socket que no debe recibir el mensaje.
   * @param payload - Mensaje JSON a reenviar.
   */
  private async broadcast(exclude: WebSocket, payload: string) {
    for (const [socket, session] of this.sessions) {
      if (socket !== exclude && socket.readyState === 1) {
        if (await this.allowed(session, false)) socket.send(payload);
        else socket.close(1008, "Acceso retirado");
      }
    }
  }

  /**
   * Revalida permisos y pertenencia antes de cada mensaje y entrega.
   * @param session - Cuenta y contexto de la pizarra.
   * @param write - Si se solicita permiso de edición.
   * @returns Si la cuenta conserva el acceso necesario.
   */
  private async allowed(session: Session, write: boolean) {
    const db = this.env.DB;
    if (!db) return false;
    const project = await db.prepare("SELECT id FROM projects WHERE id = ?").bind(session.projectId).first();
    if (!project) return false;
    if (session.ownerType === "task") {
      const task = await db.prepare("SELECT id FROM tasks WHERE id = ? AND project_id = ?").bind(session.ownerId, session.projectId).first();
      if (!task) return false;
    } else if ((session.ownerType !== "project" && session.ownerType !== "space") || session.ownerId !== session.projectId) return false;
    const owner = await ensureInstanceOwner(db, { userId: session.userId, email: session.email }, this.env.OWNER_EMAIL);
    if (isInstanceOwner(owner, session)) return true;
    const admin = await db.prepare("SELECT id FROM administrators_unified WHERE user_id = ?").bind(session.userId).first();
    if (admin) return true;
    const member = await db.prepare("SELECT role, student_section AS studentSection FROM project_members WHERE project_id = ? AND user_id = ? AND status = 'active'").bind(session.projectId, session.userId).first<{ role: string; studentSection: string | null }>();
    if (!member) return false;
    if (!write) return true;
    if (member.role === "teacher") return true;
    if (member.role !== "student" || !member.studentSection || session.ownerType !== "task") return false;
    const refs = await db.prepare("SELECT kind, profile_id AS profileId FROM task_assignees WHERE project_id = ? AND task_id = ?").bind(session.projectId, session.ownerId).all<{ kind: string; profileId: string }>();
    return refs.results?.length === 1 && refs.results[0].kind === "student" && refs.results[0].profileId === member.studentSection;
  }
}
