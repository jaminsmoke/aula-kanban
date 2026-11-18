import { AULA_DOCUMENT_SCHEMA_VERSION, type AulaDocument } from "./document";

const STARTER_TITLE = "Documento de ejemplo";

/**
 * Crea una copia independiente del documento inicial de Aula Documentos.
 * @returns Un documento válido con texto y una invitación a insertar un diagrama.
 */
export function createStarterAulaDocument(): AulaDocument {
  return {
    schemaVersion: AULA_DOCUMENT_SCHEMA_VERSION,
    title: STARTER_TITLE,
    content: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Introducción" }],
        },
        {
          type: "paragraph",
          content: [{
            type: "text",
            text: "Escribe una idea, aplica formato y añade un diagrama cuando lo necesites. El documento se guarda en este proyecto.",
          }],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Plan de trabajo" }],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [{
                type: "paragraph",
                content: [{ type: "text", text: "Preparar el material de clase." }],
              }],
            },
            {
              type: "listItem",
              content: [{
                type: "paragraph",
                content: [{ type: "text", text: "Insertar un diagrama con el botón «Diagrama»." }],
              }],
            },
            {
              type: "listItem",
              content: [{
                type: "paragraph",
                content: [{ type: "text", text: "Guardar antes de cerrar la ventana." }],
              }],
            },
          ],
        },
        {
          type: "paragraph",
          content: [{
            type: "text",
            text: "El texto y los diagramas forman un único documento y se exportan juntos.",
          }],
        },
      ],
    },
  };
}
