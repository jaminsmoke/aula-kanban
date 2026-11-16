import { DEMO_COOKIE } from "../../../lib/domain/demo";

/**
 * Desactiva la demo y vuelve a la portada.
 * @returns Una redirección que borra la cookie de demo.
 */
export function GET(): Response {
  return new Response(null, {
    status: 303,
    headers: {
      location: "/",
      "set-cookie": `${DEMO_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
      "cache-control": "no-store",
    },
  });
}
