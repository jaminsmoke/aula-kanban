import { json } from "../../../lib/server/http";
import { withProjectRoute } from "../../../lib/server/route-helpers";
import { listBooks } from "../../../lib/server/books";

export const dynamic = "force-dynamic";

/**
 * Lista el catálogo de libros escolares con su procedencia y su
 * disponibilidad. Los libros no son apps instalables: es lectura del
 * catálogo curado (`lib/books.ts`), con la URL del archivo cuando el
 * PDF ya está persistido en R2. Requiere la membresía activa en el
 * proyecto, como el resto de rutas de proyecto.
 */
export const GET = withProjectRoute(async (_request, project) => {
  try {
    return json({ books: listBooks(project.id) });
  } catch {
    return json({ message: "No se pudieron consultar los libros." }, 502);
  }
});
