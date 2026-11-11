import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aula Kanban",
  description: "Tablero colaborativo de tareas para el grupo de clase.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es"><body>{children}</body></html>;
}
