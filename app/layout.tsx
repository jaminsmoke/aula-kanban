import type { Metadata } from "next";
import "./globals.css";
import "./board/chrome.css";
import "./board/access.css";
import "./board/kanban.css";
import "./board/dialogs.css";
import "./board/views.css";
import "./board/responsive.css";

export const metadata: Metadata = {
  title: "Aula Kanban",
  description: "Tablero colaborativo de tareas para el grupo de clase.",
  icons: { icon: "/favicon.svg" },
};

const fontStylesheet =
  "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Instrument+Sans:wght@400..700&display=swap";

/**
 * Layout raíz con metadatos, fuentes y hojas de estilo.
 * @param props - Contenido de la página.
 * @returns El documento HTML de la aplicación.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={fontStylesheet} precedence="default" />
      </head>
      <body>{children}</body>
    </html>
  );
}
