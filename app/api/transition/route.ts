import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { isOwner } from "../project";

export const dynamic = "force-dynamic";
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
async function authorize() { const user = await getChatGPTUser(); return Boolean(user && isOwner(user)); }

export async function GET() {
  if (!await authorize()) return json({ message: "Solo el propietario puede realizar esta transición." }, 403);
  if (!env.DB) return json({ message: "Base de datos no disponible." }, 503);
  const result = await env.DB.prepare("SELECT status FROM transition_state WHERE id = 'administrators-v2'").first<{ status: string }>();
  return json({ status: result?.status ?? "pending" });
}

export async function POST(request: Request) {
  if (!await authorize()) return json({ message: "Solo el propietario puede realizar esta transición." }, 403);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json" || request.headers.get("origin") !== new URL(request.url).origin)
    return json({ message: "Solicitud no válida." }, 403);
  const db = env.DB, key = "administrators-v2", now = Date.now();
  if (!db) return json({ message: "Base de datos no disponible." }, 503);
  try {
    await db.batch([
      db.prepare("INSERT INTO transition_state (id, status) VALUES (?, 'copying') ON CONFLICT(id) DO NOTHING").bind(key),
      db.prepare(`INSERT INTO administrators_unified (id, email, user_id, display_name, revision, mutation_token, created_at)
        SELECT COALESCE(a.profile_id, a.id), a.email, a.user_id, COALESCE(p.display_name, ''), COALESCE(p.revision, 1), p.mutation_token, a.created_at
        FROM administrators a LEFT JOIN administrator_profiles p ON p.id = a.profile_id
        WHERE (SELECT status FROM transition_state WHERE id = ?) = 'copying'`).bind(key),
      db.prepare(`INSERT INTO administrators_unified (id, email, user_id, display_name, revision, mutation_token, created_at)
        SELECT p.id, NULL, NULL, p.display_name, p.revision, p.mutation_token, ?
        FROM administrator_profiles p WHERE NOT EXISTS (SELECT 1 FROM administrators a WHERE a.profile_id = p.id)
        AND (SELECT status FROM transition_state WHERE id = ?) = 'copying'`).bind(now, key),
      db.prepare("UPDATE transition_state SET status = 'complete' WHERE id = ? AND status = 'copying'").bind(key),
    ]);
    const state = await db.prepare("SELECT status FROM transition_state WHERE id = ?").bind(key).first<{ status: string }>();
    return state?.status === "complete" ? json({ status: state.status }) : json({ message: "No se completó la transición." }, 409);
  } catch { return json({ message: "El traslado no se aplicó. Revisa conflictos entre identificadores de administrador." }, 409); }
}
