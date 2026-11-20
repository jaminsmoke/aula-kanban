import { createContext, useContext, type ReactNode } from "react";
import type { useAulaDocumentosModel } from "./hooks/use-aula-documentos-model";

type AulaDocumentosModel = ReturnType<typeof useAulaDocumentosModel>;

const AulaDocumentosContext = createContext<AulaDocumentosModel | null>(null);

/**
 * Provee el modelo de Aula Documentos a la vista.
 * @param props - Modelo y contenido.
 * @returns El proveedor de contexto.
 */
export function AulaDocumentosProvider({
  value,
  children,
}: {
  value: AulaDocumentosModel;
  children: ReactNode;
}) {
  return <AulaDocumentosContext.Provider value={value}>{children}</AulaDocumentosContext.Provider>;
}

/**
 * Accede al modelo de la vista de Aula Documentos.
 * @returns El modelo compartido.
 */
export function useAulaDocumentosView(): AulaDocumentosModel {
  const value = useContext(AulaDocumentosContext);
  if (!value) throw new Error("AulaDocumentosProvider no está disponible.");
  return value;
}
