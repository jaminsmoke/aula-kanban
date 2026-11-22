"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ChangeEvent, type FormEvent } from "react";
import { Chess, SQUARES, type Square } from "chess.js";
import { Chessboard, type PieceDropHandlerArgs, type SquareHandlerArgs } from "react-chessboard";
import { RotateCcw, Swords } from "lucide-react";
import { gameStatus, kingSquare, START_FEN, type MoveRecord, type PromotionPiece } from "./ajedrez-model";
import "../app-window.css";
import "./ajedrez.css";

type Mode = "local" | "random";
type LastMove = { from: Square; to: Square };
type PendingPromotion = { from: Square; to: Square };

const PROMOTION_OPTIONS: { piece: PromotionPiece; label: string }[] = [
  { piece: "q", label: "Dama" },
  { piece: "r", label: "Torre" },
  { piece: "b", label: "Alfil" },
  { piece: "n", label: "Caballo" },
];

/**
 * Ajedrez local con dos jugadores o un rival aleatorio.
 * @returns La ventana de la app con tablero, estado e historial.
 */
export default function AjedrezApp() {
  const [fen, setFen] = useState(START_FEN);
  const [positions, setPositions] = useState<string[]>([START_FEN]);
  const [history, setHistory] = useState<MoveRecord[]>([]);
  const [selected, setSelected] = useState<Square | null>(null);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [promotion, setPromotion] = useState<PendingPromotion | null>(null);
  const [mode, setMode] = useState<Mode>("local");
  const [keyboardFrom, setKeyboardFrom] = useState<Square | "">("");
  const [keyboardTo, setKeyboardTo] = useState<Square | "">("");
  const game = useMemo(() => new Chess(fen), [fen]);
  const status = gameStatus(game, positions);
  const isOver = status.tone === "over";
  const isRivalTurn = mode === "random" && game.turn() === "b";
  const canPlay = !isOver && !promotion && !isRivalTurn;
  const visibleStatus = isRivalTurn && !isOver
    ? { label: "El rival está pensando…", tone: "turn" as const }
    : status;

  const legalTargets = useMemo(() => {
    if (!selected) return [] as Square[];
    return game.moves({ square: selected, verbose: true }).map((move) => move.to);
  }, [game, selected]);

  const fromOptions = useMemo(() => {
    if (!canPlay) return [] as Square[];
    return SQUARES.filter((square) => game.get(square)?.color === game.turn());
  }, [canPlay, game]);

  const activeKeyboardFrom = keyboardFrom && fromOptions.includes(keyboardFrom) ? keyboardFrom : "";
  const toOptions = useMemo(() => {
    if (!activeKeyboardFrom) return [] as Square[];
    return game.moves({ square: activeKeyboardFrom, verbose: true }).map((move) => move.to);
  }, [activeKeyboardFrom, game]);
  const activeKeyboardTo = toOptions.includes(keyboardTo as Square) ? keyboardTo : "";

  const squareStyles = useMemo(() => {
    const styles: Record<string, CSSProperties> = {};
    const add = (square: string, style: CSSProperties) => {
      styles[square] = { ...styles[square], ...style };
    };

    if (lastMove) {
      add(lastMove.from, { backgroundColor: "var(--chess-last)" });
      add(lastMove.to, { backgroundColor: "var(--chess-last)" });
    }
    if (game.isCheck() || game.isCheckmate()) {
      const king = kingSquare(game, game.turn());
      if (king) add(king, { backgroundColor: "var(--chess-check)" });
    }
    if (selected) {
      add(selected, { boxShadow: "inset 0 0 0 3px var(--chess-selected-ring)" });
    }
    for (const target of legalTargets) {
      add(target, { boxShadow: "inset 0 0 0 3px var(--chess-target-ring)" });
    }
    return styles;
  }, [game, lastMove, legalTargets, selected]);

  const commitMove = useCallback((from: Square, to: Square, promotionPiece?: PromotionPiece): boolean => {
    const next = new Chess(fen);
    const move = next.move({ from, to, promotion: promotionPiece });
    if (!move) return false;
    const nextFen = next.fen();
    setFen(nextFen);
    setPositions((current) => [...current, nextFen]);
    setHistory((current) => [...current, { san: move.san, color: move.color }]);
    setLastMove({ from: move.from, to: move.to });
    setSelected(null);
    setKeyboardFrom("");
    setKeyboardTo("");
    setPromotion(null);
    return true;
  }, [fen]);

  useEffect(() => {
    if (!isRivalTurn || isOver || promotion) return;
    const timer = window.setTimeout(() => {
      const moves = game.moves({ verbose: true });
      if (!moves.length) return;
      const move = moves[Math.floor(Math.random() * moves.length)];
      commitMove(move.from, move.to, move.promotion as PromotionPiece | undefined);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [commitMove, game, isOver, isRivalTurn, promotion]);

  function tryMove(from: Square, to: Square): boolean {
    if (!canPlay) return false;
    const legal = game.moves({ square: from, verbose: true }).filter((move) => move.to === to);
    if (!legal.length) return false;
    if (legal.some((move) => move.promotion)) {
      setPromotion({ from, to });
      setSelected(null);
      return true;
    }
    return commitMove(from, to);
  }

  function handleSquareClick({ square }: SquareHandlerArgs) {
    if (!canPlay) return;
    const target = square as Square;
    if (selected) {
      if (target === selected) {
        setSelected(null);
        return;
      }
      if (legalTargets.includes(target)) {
        tryMove(selected, target);
        return;
      }
      const piece = game.get(target);
      if (piece?.color === game.turn()) {
        setSelected(target);
        return;
      }
      setSelected(null);
      return;
    }
    const piece = game.get(target);
    if (piece?.color === game.turn()) setSelected(target);
  }

  function handlePieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    if (!targetSquare) return false;
    return tryMove(sourceSquare as Square, targetSquare as Square);
  }

  function handleKeyboardFrom(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value as Square | "";
    setKeyboardFrom(value);
    const moves = value ? game.moves({ square: value, verbose: true }) : [];
    setKeyboardTo(moves[0]?.to ?? "");
  }

  function handleKeyboardMove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeKeyboardFrom || !activeKeyboardTo) return;
    tryMove(activeKeyboardFrom, activeKeyboardTo);
  }

  function reset() {
    setFen(START_FEN);
    setPositions([START_FEN]);
    setHistory([]);
    setSelected(null);
    setLastMove(null);
    setPromotion(null);
    setKeyboardFrom("");
    setKeyboardTo("");
  }

  const movePairs = history.reduce<{ number: number; white?: MoveRecord; black?: MoveRecord }[]>((pairs, move, index) => {
    if (index % 2 === 0) pairs.push({ number: index / 2 + 1, white: move });
    else pairs[pairs.length - 1].black = move;
    return pairs;
  }, []);

  const boardOptions = {
    position: fen,
    onPieceDrop: handlePieceDrop,
    onSquareClick: handleSquareClick,
    allowDragging: canPlay,
    canDragPiece: ({ piece }: { piece: { pieceType: string } }) => canPlay && piece.pieceType[0] === game.turn(),
    showNotation: true,
    showAnimations: false,
    boardStyle: {
      borderRadius: "var(--radius-md)",
      overflow: "hidden",
      boxShadow: "var(--ui-shadow-card)",
    },
    darkSquareStyle: { backgroundColor: "var(--chess-dark)" },
    lightSquareStyle: { backgroundColor: "var(--chess-light)" },
    darkSquareNotationStyle: { color: "var(--chess-light)" },
    lightSquareNotationStyle: { color: "var(--ui-text-muted)" },
    squareStyles,
  };

  return (
    <div className="app-window ajedrez-app">
      <header className="ajedrez-toolbar ui-toolbar">
        <div className="ajedrez-heading">
          <span className="ajedrez-mark" aria-hidden><Swords size={18} strokeWidth={2} /></span>
          <span>
            <strong>Ajedrez</strong>
            <small>Dos jugadores en este navegador</small>
          </span>
        </div>
        <button type="button" className="ajedrez-reset" onClick={reset}>
          <RotateCcw size={15} aria-hidden /> Nueva partida
        </button>
      </header>

      <div className="ajedrez-layout">
        <div className="ajedrez-board-column">
          <div className="ajedrez-board-shell" role="group" aria-label="Tablero de ajedrez">
            <Chessboard options={boardOptions} />
            {promotion ? (
              <div className="ajedrez-promotion" role="dialog" aria-modal="true" aria-label="Elegir pieza de coronación">
                <p>Elige la pieza para coronar</p>
                <div className="ajedrez-promotion-options">
                  {PROMOTION_OPTIONS.map((option) => (
                    <button
                      key={option.piece}
                      type="button"
                      onClick={() => commitMove(promotion.from, promotion.to, option.piece)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <p className="ajedrez-hint">Haz clic en una pieza y luego en una casilla, arrástrala o usa el formulario de teclado. Al coronar, elige la pieza.</p>
        </div>

        <aside className="ajedrez-side">
          <section className="ajedrez-mode-card">
            <div className="ajedrez-mode" role="group" aria-label="Modo de juego">
              <button type="button" aria-pressed={mode === "local"} onClick={() => setMode("local")}>Dos jugadores</button>
              <button type="button" aria-pressed={mode === "random"} onClick={() => setMode("random")}>Rival aleatorio</button>
            </div>
            <p className="ajedrez-mode-note">
              {mode === "random" ? "Juegas con blancas; el rival mueve al azar." : "Ambos jugadores comparten este tablero."}
            </p>
          </section>

          <section className={`ajedrez-status is-${visibleStatus.tone}`} role="status" aria-live="polite">
            <span className="ajedrez-status-dot" aria-hidden />
            <p>{visibleStatus.label}</p>
          </section>

          <form className="ajedrez-keyboard" onSubmit={handleKeyboardMove}>
            <div className="ajedrez-keyboard-head">
              <h4>Mover con teclado</h4>
              <span>Alternativa accesible</span>
            </div>
            <div className="ajedrez-keyboard-fields">
              <label htmlFor="ajedrez-from">
                Desde
                <select id="ajedrez-from" value={activeKeyboardFrom} onChange={handleKeyboardFrom} disabled={!canPlay}>
                  <option value="">Elige pieza</option>
                  {fromOptions.map((square) => <option key={square} value={square}>{square}</option>)}
                </select>
              </label>
              <label htmlFor="ajedrez-to">
                Hasta
                <select
                  id="ajedrez-to"
                  value={activeKeyboardTo}
                  onChange={(event) => setKeyboardTo(event.target.value as Square | "")}
                  disabled={!canPlay || !activeKeyboardFrom}
                >
                  <option value="">Elige casilla</option>
                  {toOptions.map((square) => <option key={square} value={square}>{square}</option>)}
                </select>
              </label>
            </div>
            <button type="submit" disabled={!canPlay || !activeKeyboardFrom || !activeKeyboardTo}>Mover</button>
          </form>

          <section className="ajedrez-history" aria-label="Historial de jugadas">
            <div className="ajedrez-history-head">
              <h4>Jugadas</h4>
              <span>{history.length}</span>
            </div>
            {movePairs.length ? (
              <ol className="ajedrez-history-list">
                {movePairs.map((pair) => (
                  <li key={pair.number}>
                    <span className="ajedrez-move-number">{pair.number}.</span>
                    <span>{pair.white?.san ?? ""}</span>
                    <span>{pair.black?.san ?? ""}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="ajedrez-history-empty ui-empty">Aún no hay jugadas.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
