import { requireChatGPTUser } from "../lib/server/auth";
import Board from "./board";

export const dynamic = "force-dynamic";

/**
 * Página principal: exige sesión y renderiza el tablero.
 * @param props - Parámetros de la URL con el proyecto opcional.
 * @returns El tablero para la cuenta autenticada.
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ project?: string | string[] }> }) {
  const params = await searchParams;
  const project = typeof params.project === "string" ? params.project : "";
  const returnTo = project ? `/?project=${encodeURIComponent(project)}` : "/";
  const user = await requireChatGPTUser(returnTo);
  return <Board user={{ displayName: user.displayName, email: user.email }} />;
}
