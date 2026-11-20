import { DEMO_COOKIE, DEMO_PROJECT_ID } from "../../lib/domain/demo";
import { findProject } from "../../lib/server/projects/project-access";

export const dynamic = "force-dynamic";

/**
 * Página mínima cuando el proyecto de demostración aún no está sembrado.
 * @returns Una respuesta HTML 404 con la orden de siembra.
 */
function missingDemoPage(): Response {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Demo no disponible · Aula Kanban</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; background: #f7f8fc; color: #211b36; font-family: system-ui, sans-serif; }
  main { max-width: 34rem; padding: 32px; border: 1px solid #e7e4ef; border-radius: 18px; background: #fff; box-shadow: 0 16px 48px #3022550d; }
  h1 { margin: 0 0 12px; font-size: 1.6rem; }
  p { line-height: 1.6; color: #4a4458; }
  code { padding: 2px 6px; border-radius: 6px; background: #eeebfb; }
  a { color: #5839be; font-weight: 600; }
</style>
</head>
<body>
<main>
  <h1>La demo aún no está sembrada</h1>
  <p>Esta instancia no tiene el proyecto de demostración. En local, ejecuta <code>npm run seed:demo</code> y vuelve a abrir la demo. En una instancia publicada, quien la administra puede prepararlo con el SQL de la demo y Codex lo aplica con autorización.</p>
  <p><a href="/">Volver a la portada</a></p>
</main>
</body>
</html>`;
  return new Response(html, {
    status: 404,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

/**
 * Activa la demo de solo lectura y abre su proyecto.
 * Sin cookie no hay identidad de demo; con sesión real de Sites, la sesión
 * real tiene prioridad y la cookie se ignora.
 * @returns Una redirección al tablero demo o una página si falta la semilla.
 */
export async function GET(): Promise<Response> {
  const project = await findProject(DEMO_PROJECT_ID);
  if (!project) return missingDemoPage();

  return new Response(null, {
    status: 303,
    headers: {
      location: `/?project=${DEMO_PROJECT_ID}`,
      "set-cookie": `${DEMO_COOKIE}=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800`,
      "cache-control": "no-store",
    },
  });
}
