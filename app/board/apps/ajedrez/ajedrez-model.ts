import { Chess, SQUARES, type Color, type Square } from "chess.js";

/** Posición inicial estándar. */
export const START_FEN = new Chess().fen();

/** Pieza elegida al coronar un peón. */
export type PromotionPiece = "q" | "r" | "b" | "n";

/** Una jugada del historial, en notación algebraica. */
export type MoveRecord = {
  san: string;
  color: Color;
};

/** Estado visible de la partida. */
export type GameStatus = {
  label: string;
  tone: "turn" | "check" | "over";
};

/**
 * Clave de posición sin relojes ni número de jugada, para detectar repeticiones.
 * @param fen - FEN completo.
 * @returns Los cuatro primeros campos del FEN.
 */
export function positionKey(fen: string): string {
  return fen.split(" ").slice(0, 4).join(" ");
}

/**
 * ¿La posición actual se ha repetido tres veces?
 * @param positions - FEN de cada posición, incluida la actual.
 * @param fen - FEN actual.
 * @returns `true` si hay triple repetición.
 */
export function isThreefold(positions: string[], fen: string): boolean {
  const key = positionKey(fen);
  return positions.filter((position) => positionKey(position) === key).length >= 3;
}

/**
 * Rey de un color, para resaltar el jaque.
 * @param game - Partida actual.
 * @param color - Color del rey.
 * @returns La casilla del rey o `undefined`.
 */
export function kingSquare(game: Chess, color: Color): Square | undefined {
  return SQUARES.find((square) => {
    const piece = game.get(square);
    return piece?.type === "k" && piece.color === color;
  });
}

/**
 * Texto y tono del estado de la partida.
 * @param game - Partida actual.
 * @param positions - Historial de FEN para detectar repeticiones.
 * @returns El estado que se muestra en la ventana.
 */
export function gameStatus(game: Chess, positions: string[]): GameStatus {
  if (game.isCheckmate()) {
    const winner = game.turn() === "w" ? "negras" : "blancas";
    return { label: `Jaque mate. Ganan las ${winner}.`, tone: "over" };
  }
  if (game.isStalemate()) return { label: "Tablas por ahogado.", tone: "over" };
  if (game.isInsufficientMaterial()) return { label: "Tablas por material insuficiente.", tone: "over" };
  if (isThreefold(positions, game.fen())) return { label: "Tablas por repetición.", tone: "over" };
  if (game.isDrawByFiftyMoves()) return { label: "Tablas por la regla de 50 jugadas.", tone: "over" };
  if (game.isDraw()) return { label: "Tablas.", tone: "over" };
  if (game.isCheck()) {
    const side = game.turn() === "w" ? "blancas" : "negras";
    return { label: `Jaque a las ${side}.`, tone: "check" };
  }
  const side = game.turn() === "w" ? "blancas" : "negras";
  return { label: `Turno de las ${side}.`, tone: "turn" };
}
