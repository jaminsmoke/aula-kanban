"use client";

import { ExternalLink } from "lucide-react";

/**
 * URL del site de Nodum donde vive la base de conocimiento. Nodum
 * (MIT) se despliega como site propio en el VPS —no forma parte de
 * este código—; apunta aquí vía `VITE_NODUM_URL`/`NEXT_PUBLIC_NODUM_URL`
 * (ver `tools.ts`) o a la instancia pública por defecto.
 */

/**
 * Ventana «Nodum» del hub: incrusta el site de Nodum (wikilinks,
 * backlinks y grafo) en un iframe a pantalla completa, con enlace
 * para abrirlo en pestaña nueva. La instancia pública nodum.md envía
 * `X-Frame-Options: DENY` y el navegador bloquea el marco sin aviso
 * (no es un fallo de Aula); el iframe solo funciona con una instancia
 * propia configurada vía `VITE_NODUM_URL` que permita ser embebida
 * (ver README, «Mi espacio»).
 * @returns La ventana con el iframe de Nodum o el aviso de configuración.
 */
export default function NodumApp({ instanceUrl }: { instanceUrl?: string }) {
  const NODUM_URL = instanceUrl || "https://nodum.md";
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
      {instanceUrl ? <iframe
        className="nodum-frame"
        src={NODUM_URL}
        title="Nodum"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
      /> : <p className="nodum-bar-note" style={{ padding: 20 }}>
        Nodum todavía no está disponible en el gestor de esta instancia. Puedes abrir la página pública en otra pestaña.
      </p>}
    </div>
  );
}
