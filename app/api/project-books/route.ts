import { tieneCapacidad } from "../../../lib/server/access/capabilities";
import { json } from "../../../lib/server/http";
import { withProjectRoute } from "../../../lib/server/route-helpers";
import { ProjectBooksError, listProjectBooks, parseProjectBooks, setProjectBooks } from "../../../lib/server/books/project-books";

export const dynamic = "force-dynamic";

/**
 * Lista los libros del catálogo con su habilitación en el proyecto
 * activo. Cualquier miembro con acceso al proyecto puede leerla (es lo
 * que necesita la pestaña de herramientas y, después, la mochila).
 */
export const GET = withProjectRoute(async (_request, project) => {
  try {
    return json({ books: await listProjectBooks(project.id) });
  } catch {
    return json({ message: "No se pudieron consultar los libros del proyecto." }, 502);
  }
});

/**
 * Guarda la lista completa de libros habilitados del proyecto. Solo el
 * dueño, un administrador o el profesor del propio proyecto (un
 * alumno o invitado no puede). El conjunto recibido sustituye al
 * anterior: lo que no venga queda deshabilitado.
 */
export const PUT = withProjectRoute(async (request, project) => {
  if (!(await tieneCapacidad(project.access.user, "asignar-libros", project.id))) {
    return json({ message: "Solo el profesorado puede asignar libros." }, 403);
  }
  try {
    const bookIds = parseProjectBooks(await request.json().catch(() => null));
    const saved = await setProjectBooks(project.id, bookIds);
    return json({ books: await listProjectBooks(project.id), saved });
  } catch (error) {
    if (error instanceof ProjectBooksError) return json({ message: error.message }, error.status);
    return json({ message: "No se pudieron guardar los libros del proyecto." }, 502);
  }
});
