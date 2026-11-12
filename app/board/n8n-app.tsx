"use client";

import { ExternalLink } from "lucide-react";

/**
 * URL de la instancia n8n que se incrusta en la ventana. n8n (Sustainable
 * Use License) se despliega como servicio propio en el VPS —no forma parte
 * de este código—; apunta aquí vía `VITE_N8N_URL`/`NEXT_PUBLIC_N8N_URL`
 * (ver `tools.ts`).
 */

/**
 * Ventana «n8n» del hub: incrusta la instancia propia de n8n (automatización
 * de flujos y conexiones entre aplicaciones) en un iframe a pantalla
 * completa, con enlace para abrirlo en pestaña nueva. n8n no envía
 * `X-Frame-Options` por defecto y n8n Cloud (de pago) no es una instancia
 * embebible: no hay página pública que incrustar, así que sin instancia
 * propia configurada la ventana muestra un aviso (ver README, «Mi espacio»).
 * n8n es un servicio independiente: sus flujos, cuentas y credenciales se
 * gestionan dentro de n8n, no aquí. Licencia: Sustainable Use License —
 * el uso interno/personal en la propia instancia está permitido (ver README).
 * @returns La ventana con el iframe de n8n o el aviso de configuración.
 */
export default function N8nApp({ instanceUrl }: { instanceUrl?: string }) {
  const N8N_URL = instanceUrl || "https://n8n.io";
  return (
    <div className="n8n-app">
      <div className="n8n-bar">
        <span className="n8n-bar-note">
          n8n es un servicio independiente. Sus flujos y credenciales se gestionan en n8n.
        </span>
        <a className="n8n-bar-link" href={N8N_URL} target="_blank" rel="noopener noreferrer">
          Abrir en pestaña nueva <ExternalLink size={13} aria-hidden />
        </a>
      </div>
      {instanceUrl ? <iframe
        className="n8n-frame"
        src={N8N_URL}
        title="n8n"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
      /> : <p className="n8n-bar-note" style={{ padding: 20 }}>
        n8n todavía no está disponible en el gestor de esta instancia. Puedes conocerlo en n8n.io en otra pestaña.
      </p>}
    </div>
  );
}
