"use client";

import { Suspense, lazy } from "react";
import { AnimatePresence, m } from "motion/react";

/** Lottie solo para el check de instalación: chunk aparte, cargado con lazy. */
const StoreLottie = lazy(() => import("./store-lottie"));

/**
 * Check animado que aparece al completar una instalación.
 * @param props - Si debe mostrarse.
 * @returns El overlay animado o `null`.
 */
export default function StoreSuccess({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible ? (
        <m.div className="store-success" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} transition={{ duration: 0.3, ease: "easeOut" }}>
          <span className="store-success-lottie"><Suspense fallback={null}><StoreLottie /></Suspense></span>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
