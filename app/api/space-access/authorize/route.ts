export const dynamic = "force-dynamic";

/**
 * La integración de aplicaciones externas se ha retirado.
 * @returns Respuesta que indica que la ruta ya no está disponible.
 */
export async function POST() {
  return Response.json({ message: "Esta integración ya no está disponible." }, { status: 410, headers: { "Cache-Control": "no-store" } });
}
