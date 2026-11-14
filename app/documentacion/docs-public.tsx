"use client";

import { useRouter } from "next/navigation";
import DocumentationView from "../board/docs/docs-view";

/**
 * Documentación pública: misma vista que la del tablero, sin exigir sesión.
 * «Volver a Clase» va a `/`, que para un visitante anónimo pasa por el login.
 * @param props - Ruta de inicio de sesión con retorno a esta página.
 * @returns La documentación visible sin sesión, con enlace para iniciar sesión.
 */
export default function DocsPublic({ signInHref }: { signInHref: string }) {
  const router = useRouter();
  return (
    <main className="shell">
      <p style={{ display: "flex", justifyContent: "flex-end", margin: "12px 0 0" }}>
        <a className="primary" href={signInHref} target="_top">Iniciar sesión con ChatGPT</a>
      </p>
      <DocumentationView onBack={() => router.push("/")} />
    </main>
  );
}
