import Image from "next/image";
import type { SpaceIconProps } from "./tools";

/** Icono oficial incluido en el sistema de diseño de n8n. */
export function N8nIcon({ size = 24, className }: SpaceIconProps) {
  return <Image src="/n8n-logo.svg" alt="" width={size} height={size} className={className} />;
}
