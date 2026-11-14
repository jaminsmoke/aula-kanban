import type { Metadata } from "next";
import "./globals.css";
import "./board/styles/buttons.css";
import "./board/styles/access.css";
import "./board/styles/dialogs.css";

export const metadata: Metadata = {
  title: "Aula Kanban",
  description: "Tablero colaborativo de tareas para el grupo de clase.",
  icons: { icon: "/favicon.svg" },
};

/**
 * Layout raíz con metadatos y hojas de estilo.
 * Las fuentes se autohospedan en `public/fonts` y se declaran en `globals.css`.
 * @param props - Contenido de la página.
 * @returns El documento HTML de la aplicación.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
