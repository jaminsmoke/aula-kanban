import Image from "next/image";
import type { SpaceIconProps } from "./tools";

/**
 * Icono oficial de Nodum (nudo), servido desde `public/nodum-logo.png`
 * (asset del repo MIT de nodum).
 * @param props - Tamaño y clases del icono.
 * @returns El logo de nodum como imagen.
 */
export function NodumIcon({ size = 24, className }: SpaceIconProps) {
  return <Image src="/nodum-logo.png" alt="" width={size} height={size} className={className} />;
}
