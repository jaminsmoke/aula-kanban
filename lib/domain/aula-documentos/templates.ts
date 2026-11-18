import type { JSONContent } from "@tiptap/core";
import {
  AULA_DOCUMENT_SCHEMA_VERSION,
  createEmptyAulaDocument,
  type AulaDocument,
} from "./document";
import { createStarterAulaDocument } from "./starter";

/** Identificadores estables de las plantillas de Aula Documentos. */
export type AulaDocumentTemplateId =
  | "empty"
  | "starter"
  | "notes"
  | "class-project"
  | "presentation"
  | "guide";

/** Plantilla que puede crear un documento nuevo. */
export type AulaDocumentTemplate = {
  id: AulaDocumentTemplateId;
  name: string;
  description: string;
  focus: "title" | "editor";
  create: () => AulaDocument;
};

/**
 * Crea un nodo de texto.
 * @param value - Texto visible.
 * @returns Nodo de texto.
 */
function text(value: string): JSONContent {
  return { type: "text", text: value };
}

/**
 * Crea un título.
 * @param level - Nivel permitido.
 * @param value - Texto del título.
 * @returns Nodo de título.
 */
function heading(level: 1 | 2 | 3, value: string): JSONContent {
  return { type: "heading", attrs: { level }, content: [text(value)] };
}

/**
 * Crea un párrafo.
 * @param value - Texto del párrafo.
 * @returns Nodo de párrafo.
 */
function paragraph(value: string): JSONContent {
  return { type: "paragraph", content: [text(value)] };
}

/**
 * Crea una lista con viñetas.
 * @param items - Textos de los elementos.
 * @returns Nodo de lista.
 */
function bulletList(items: string[]): JSONContent {
  return {
    type: "bulletList",
    content: items.map((item) => ({
      type: "listItem",
      content: [paragraph(item)],
    })),
  };
}

/**
 * Crea una lista numerada.
 * @param items - Textos de los elementos.
 * @returns Nodo de lista.
 */
function orderedList(items: string[]): JSONContent {
  return {
    type: "orderedList",
    attrs: { start: 1 },
    content: items.map((item) => ({
      type: "listItem",
      content: [paragraph(item)],
    })),
  };
}

/**
 * Crea una cita.
 * @param value - Texto de la cita.
 * @returns Nodo de cita.
 */
function blockquote(value: string): JSONContent {
  return { type: "blockquote", content: [paragraph(value)] };
}

/**
 * Crea un bloque Mermaid.
 * @param code - Código del diagrama.
 * @returns Nodo Mermaid.
 */
function mermaid(code: string): JSONContent {
  return { type: "mermaidBlock", attrs: { code } };
}

/**
 * Construye un documento de plantilla con contenido tipado.
 * @param title - Título inicial.
 * @param content - Bloques del documento.
 * @returns Documento válido para guardar.
 */
function templateDocument(title: string, content: JSONContent[]): AulaDocument {
  return {
    schemaVersion: AULA_DOCUMENT_SCHEMA_VERSION,
    title,
    content: { type: "doc", content },
  };
}

/** Plantillas disponibles en Aula Documentos, en orden de presentación. */
export const AULA_DOCUMENT_TEMPLATES: readonly AulaDocumentTemplate[] = [
  {
    id: "empty",
    name: "Documento vacío",
    description: "Una página en blanco para empezar a escribir.",
    focus: "title",
    create: () => createEmptyAulaDocument("Documento sin título"),
  },
  {
    id: "starter",
    name: "Documento de ejemplo",
    description: "Una guía breve con texto, lista y una invitación a insertar un diagrama.",
    focus: "title",
    create: () => createStarterAulaDocument(),
  },
  {
    id: "notes",
    name: "Apuntes de clase",
    description: "Ideas, puntos clave y dudas para organizar una clase.",
    focus: "editor",
    create: () => templateDocument("Apuntes de clase", [
      heading(2, "Idea principal"),
      paragraph("Escribe aquí la idea que quieres recordar."),
      heading(2, "Puntos clave"),
      bulletList([
        "Primer punto importante.",
        "Segundo punto importante.",
        "Tercer punto importante.",
      ]),
      heading(2, "Dudas y preguntas"),
      paragraph("Añade las preguntas que quieras resolver en la próxima clase."),
      blockquote("Consejo: vuelve a estos apuntes al final del día."),
    ]),
  },
  {
    id: "class-project",
    name: "Proyecto de clase",
    description: "Objetivo, pasos, diagrama y entrega en un solo documento.",
    focus: "editor",
    create: () => templateDocument("Proyecto de clase", [
      heading(2, "Objetivo"),
      paragraph("Describe qué quieres conseguir con este proyecto."),
      heading(2, "Pasos"),
      orderedList([
        "Investigar y recoger la información.",
        "Preparar el material y el diagrama.",
        "Revisar y entregar el resultado.",
      ]),
      heading(2, "Diagrama del proyecto"),
      mermaid("flowchart TD\n  A[Idea] --> B[Desarrollo]\n  B --> C[Entrega]"),
      heading(2, "Entrega"),
      paragraph("Anota aquí la fecha, el formato y lo que hay que revisar antes de entregar."),
    ]),
  },
  {
    id: "presentation",
    name: "Presentación breve",
    description: "Tres diapositivas para exponer una idea, el contexto y el cierre.",
    focus: "editor",
    create: () => templateDocument("Presentación breve", [
      heading(2, "Idea central"),
      paragraph("Explica en una frase la idea que quieres defender."),
      { type: "slideBreak" },
      heading(2, "Contexto"),
      bulletList([
        "Qué problema resuelve.",
        "Por qué es importante ahora.",
        "Qué necesitas para llevarlo adelante.",
      ]),
      { type: "slideBreak" },
      heading(2, "Cierre"),
      paragraph("Termina con una conclusión y el siguiente paso."),
    ]),
  },
  {
    id: "guide",
    name: "Guía rápida",
    description: "Instrucciones numeradas y un consejo final.",
    focus: "editor",
    create: () => templateDocument("Guía rápida", [
      heading(2, "Antes de empezar"),
      paragraph("Reúne los materiales y comprueba que tienes todo lo necesario."),
      heading(2, "Paso a paso"),
      orderedList([
        "Prepara el espacio de trabajo.",
        "Sigue las instrucciones en orden.",
        "Comprueba el resultado antes de terminar.",
      ]),
      heading(2, "Consejo"),
      blockquote("Si algo no sale como esperabas, vuelve al paso anterior y revisa los datos."),
    ]),
  },
];

/**
 * Busca una plantilla por su identificador.
 * @param id - Identificador de la plantilla.
 * @returns La plantilla o `undefined` si no existe.
 */
export function findAulaDocumentTemplate(id: AulaDocumentTemplateId): AulaDocumentTemplate | undefined {
  return AULA_DOCUMENT_TEMPLATES.find((template) => template.id === id);
}
