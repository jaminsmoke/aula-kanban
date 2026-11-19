"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";

/** Guarda síncrona que decide si una ventana puede cerrarse. */
export type WindowCloseGuard = () => boolean;

type WindowCloseContextValue = {
  register: (guard: WindowCloseGuard) => () => void;
  attemptClose: () => void;
  forceClose: () => void;
};

const WindowCloseContext = createContext<WindowCloseContextValue | null>(null);

/**
 * Provee la guarda de cierre a la app que vive dentro de una ventana.
 * @param props - Acción de cierre y contenido de la ventana.
 * @returns El proveedor de contexto.
 */
export function WindowCloseProvider({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const guardRef = useRef<WindowCloseGuard | null>(null);

  const register = useCallback((guard: WindowCloseGuard) => {
    guardRef.current = guard;
    return () => {
      if (guardRef.current === guard) guardRef.current = null;
    };
  }, []);

  const attemptClose = useCallback(() => {
    const guard = guardRef.current;
    if (guard && !guard()) return;
    onClose();
  }, [onClose]);

  const value = useMemo(
    () => ({ register, attemptClose, forceClose: onClose }),
    [attemptClose, onClose, register],
  );

  return <WindowCloseContext.Provider value={value}>{children}</WindowCloseContext.Provider>;
}

/**
 * Registra la guarda que se ejecuta al pulsar el botón de cerrar.
 * @param guard - Función que devuelve `true` para permitir el cierre.
 */
export function useWindowCloseGuard(guard: WindowCloseGuard): void {
  const context = useContext(WindowCloseContext);
  useEffect(() => {
    if (!context) return;
    return context.register(guard);
  }, [context, guard]);
}

/**
 * Devuelve la acción que cierra la ventana sin volver a ejecutar la guarda.
 * @returns La acción de cierre forzado.
 */
export function useWindowClose(): () => void {
  const context = useContext(WindowCloseContext);
  return context?.forceClose ?? (() => {});
}

/**
 * Devuelve la acción que intenta cerrar la ventana pasando por la guarda.
 * @returns La acción de cierre con guarda.
 */
export function useWindowAttemptClose(): () => void {
  const context = useContext(WindowCloseContext);
  return context?.attemptClose ?? (() => {});
}
