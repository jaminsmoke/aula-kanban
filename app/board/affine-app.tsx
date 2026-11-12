"use client";

import { ExternalLink } from "lucide-react";

/**
 * URL de la instancia AFFiNE que se incrusta en la ventana. AFFiNE
 * (editor MIT) se despliega como site propio en el VPS —no forma parte
 * de este código—; apunta aquí vía `VITE_AFFINE_URL`/
 * `NEXT_PUBLIC_AFFINE_URL` (ver `tools.ts`) o a la instancia pública
 * por defecto.
 */

/**
 * Ventana «AFFiNE» del hub: incrusta la instancia de AFFiNE (workspace
 * con documentos, pizarra y base de conocimiento) en un iframe a
 * pantalla completa, con enlace para abrirlo en pestaña nueva. Ni
 * affine.pro ni app.affine.pro permiten el encuadre entre orígenes
 * (`X-Frame-Options: SAMEORIGIN`); el iframe solo funciona con una
 * instancia propia configurada vía `VITE_AFFINE_URL` que permita ser
 * embebida (ver README, «Mi espacio»). AFFiNE es un servicio
 * independiente: sus workspaces y cuentas se gestionan dentro de
 * AFFiNE, no aquí. Licencia: editor MIT, backend AFFiNE Enterprise
 * Edition (ver README) — usar la nube oficial no requiere esa licencia.
 * @returns La ventana con el iframe de AFFiNE o el aviso de configuración.
 */
export default function AffineApp({ instanceUrl }: { instanceUrl?: string }) {
  const AFFINE_URL = instanceUrl || "https://app.affine.pro";
  return (
    <div className="affine-app">
      <div className="affine-bar">
        <span className="affine-bar-note">
          AFFiNE es un servicio independiente. Sus workspaces y cuentas se gestionan en AFFiNE.
        </span>
        <a className="affine-bar-link" href={AFFINE_URL} target="_blank" rel="noopener noreferrer">
          Abrir en pestaña nueva <ExternalLink size={13} aria-hidden />
        </a>
      </div>
      {instanceUrl ? <iframe
        className="affine-frame"
        src={AFFINE_URL}
        title="AFFiNE"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
      /> : <p className="affine-bar-note" style={{ padding: 20 }}>
        AFFiNE todavía no está disponible en el gestor de esta instancia. Puedes abrir la página pública en otra pestaña.
      </p>}
    </div>
  );
}
