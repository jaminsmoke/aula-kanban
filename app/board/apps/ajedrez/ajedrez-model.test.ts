import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { gameStatus, isThreefold, kingSquare, positionKey, START_FEN } from "./ajedrez-model";

describe("modelo de Ajedrez", () => {
  it("empieza con las blancas y sin repeticiones", () => {
    const game = new Chess();
    expect(gameStatus(game, [START_FEN])).toEqual({ label: "Turno de las blancas.", tone: "turn" });
    expect(positionKey(START_FEN)).toBe("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -");
  });

  it("detecta jaque mate y el bando ganador", () => {
    const game = new Chess("7k/6Q1/6K1/8/8/8/8/8 b - - 0 1");
    expect(gameStatus(game, [game.fen()])).toEqual({ label: "Jaque mate. Ganan las blancas.", tone: "over" });
  });

  it("distingue ahogado y material insuficiente", () => {
    const stalemate = new Chess("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
    expect(gameStatus(stalemate, [stalemate.fen()])).toEqual({ label: "Tablas por ahogado.", tone: "over" });
    const bareKings = new Chess("8/8/8/8/8/8/8/K6k w - - 0 1");
    expect(gameStatus(bareKings, [bareKings.fen()])).toEqual({ label: "Tablas por material insuficiente.", tone: "over" });
  });

  it("detecta la triple repetición por la clave de posición", () => {
    expect(isThreefold([START_FEN, START_FEN], START_FEN)).toBe(false);
    expect(isThreefold([START_FEN, START_FEN, START_FEN], START_FEN)).toBe(true);
  });

  it("encuentra el rey que está en jaque", () => {
    const game = new Chess("7k/6Q1/6K1/8/8/8/8/8 b - - 0 1");
    expect(kingSquare(game, "b")).toBe("h8");
    expect(kingSquare(game, "w")).toBe("g6");
  });
});
