import { redirect } from "next/navigation";
import { chatGPTSignInPath, getChatGPTUser } from "../lib/server/auth";
import Board from "./board";
import Portada from "./portada";
import { buildBoardUrl, parseBoardUrl } from "./board/shared/board-url";

export const dynamic = "force-dynamic";

/**
 * Página principal: sin sesión muestra la portada pública; con sesión,
 * el tablero. La documentación del tablero vive en Ajustes; el alias
 * `?view=documentacion` sigue llevando a `/documentacion` sin sesión, y el
 * resto de vistas del tablero sigue protegido.
 * @param props - Parámetros de la URL con proyecto, vista y sección opcionales.
 * @returns La portada anónima o el tablero para la cuenta autenticada.
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ project?: string | string[]; view?: string | string[]; section?: string | string[]; app?: string | string[] }> }) {
  const params = await searchParams;
  const raw = new URLSearchParams();
  if (typeof params.project === "string" && params.project) raw.set("project", params.project);
  if (typeof params.view === "string" && params.view) raw.set("view", params.view);
  if (typeof params.section === "string" && params.section) raw.set("section", params.section);
  if (typeof params.app === "string" && params.app) raw.set("app", params.app);
  const state = parseBoardUrl(raw.toString());
  const search = buildBoardUrl(raw.toString(), state);
  const returnTo = search ? `/${search}` : "/";

  const user = await getChatGPTUser();
  if (!user) {
    if (params.view === "documentacion" || state.view === "documentacion") redirect("/documentacion");
    return <Portada signInHref={chatGPTSignInPath(returnTo)} />;
  }

  return <Board user={{ displayName: user.displayName, email: user.email }} initial={state} />;
}
