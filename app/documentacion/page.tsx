import { chatGPTSignInPath } from "../../lib/server/access/auth";
import DocsPublic from "./docs-public";

/**
 * Documentación visible sin sesión.
 * No llama a `requireChatGPTUser`: queda compatible con visitantes anónimos.
 * El tablero, las API y el socket siguen exigiendo sesión.
 * @returns La documentación pública.
 */
export default function DocumentationPage() {
  return <DocsPublic signInHref={chatGPTSignInPath("/documentacion")} />;
}
