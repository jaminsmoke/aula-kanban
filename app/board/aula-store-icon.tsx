import type { SpaceIconProps } from "./tools";

/**
 * Glifo de Aula Store: bolsa de compra con asa, dibujada en SVG propio para no
 * depender de iconos genéricos. Es solo el trazo, sin baldosa, para que cada
 * superficie (lanzador del escritorio, cabecera de la tienda) ponga su propio
 * fondo y el icono herede el color con `currentColor`.
 * @param props - Tamaño y clases del icono.
 * @returns El glifo de Aula Store como SVG.
 */
export function AulaStoreIcon({ size = 24, className }: SpaceIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Cuerpo de la bolsa, ligeramente más ancho en la base */}
      <path d="M19 26h26l1.8 20.6A6.5 6.5 0 0 1 40.3 54H23.7a6.5 6.5 0 0 1-6.5-7.4L19 26Z" />
      {/* Asa */}
      <path d="M24.5 26v-5.5a7.5 7.5 0 0 1 15 0V26" />
    </svg>
  );
}
