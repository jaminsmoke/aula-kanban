"use client";

import { ExternalLink } from "lucide-react";

/**
 * URL del site de Nodum donde vive la base de conocimiento. Nodum
 * (MIT) se despliega como site propio —no forma parte de este
 * código—; apunta aquí vía `VITE_NODUM_URL`/`NEXT_PUBLIC_NODUM_URL`
 * o a la instancia pública por defecto.
 */
const publicEnv = import.meta.env as unknown as Record<string, string | undefined>;
const configuredUrl = publicEnv.VITE_NODUM_URL || publicEnv.NEXT_PUBLIC_NODUM_URL;
const NODUM_URL: string = configuredUrl || "https://nodum.md";

/**
 * Ventana «Nodum» del hub: incrusta el site de Nodum (wikilinks,
 * backlinks y grafo) en un iframe a pantalla completa, con enlace
 * para abrirlo en pestaña nueva si el navegador bloquea el marco.
 * @returns La ventana con el iframe de Nodum.
 */
export default function NodumApp() {
  return (
    <div className="nodum-app">
      <div className="nodum-bar">
        <span className="nodum-bar-note">
          Nodum es un servicio independiente. Sus notas y acceso se gestionan en Nodum.
        </span>
        <a className="nodum-bar-link" href={NODUM_URL} target="_blank" rel="noopener noreferrer">
          Abrir en pestaña nueva <ExternalLink size={13} aria-hidden />
        </a>
      </div>
      {configuredUrl ? <iframe
        className="nodum-frame"
        src={NODUM_URL}
        title="Nodum"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
      /> : <p className="nodum-bar-note" style={{ padding: 20 }}>La página pública de Nodum debe abrirse en una pestaña nueva. Usa el enlace de arriba para acceder.</p>}
    </div>
  );
}
