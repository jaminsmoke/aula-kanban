"use client";

import type { StoreRole } from "../types";
import { AulaDocumentosProvider } from "./aula-documentos-context";
import { DocumentWorkspace } from "./components/document-workspace";
import { useAulaDocumentosModel } from "./hooks/use-aula-documentos-model";
import "./aula-documentos.css";

export { AUTOSAVE_DELAY_MS } from "./aula-documentos-types";

/**
 * Aula Documentos: texto enriquecido con bloques Mermaid en un único documento.
 * @param props - Proyecto activo y rol.
 * @returns La ventana de edición y exportación.
 */
export default function AulaDocumentosApp({ projectId, role }: { projectId: string; role: StoreRole }) {
  const model = useAulaDocumentosModel({ projectId, role });
  return (
    <AulaDocumentosProvider value={model}>
      <DocumentWorkspace />
    </AulaDocumentosProvider>
  );
}
