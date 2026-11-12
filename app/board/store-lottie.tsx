"use client";

import { Lottie } from "lottie-react";
import animationData from "./check-lottie.json";

/**
 * Animación Lottie de «instalada»: círculo y check que se dibujan al
 * terminar una instalación en Aula Store. Este módulo se carga con
 * `React.lazy` desde `apps-store.tsx`, así que `lottie-react` (y el
 * JSON) solo se descargan cuando hace falta, no al abrir la tienda.
 * @returns El check animado en Lottie.
 */
export default function StoreLottie() {
  return <Lottie src={animationData} autoplay loop={false} style={{ width: "100%", height: "100%" }} aria-hidden="true" />;
}
