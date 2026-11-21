import Link from "@tiptap/extension-link";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TextAlign from "@tiptap/extension-text-align";
import StarterKit from "@tiptap/starter-kit";
import { AulaImage } from "./image-block";
import { MermaidBlock } from "./diagramas/mermaid-block";
import { SlideBreak } from "./slide-break";
import { AulaSearchHighlight } from "../busqueda/search-highlight";

/**
 * Extensiones del editor de Aula Documentos.
 * @param projectId - Proyecto activo para resolver las imágenes locales.
 * @returns La configuración cerrada de texto y bloques.
 */
export function createAulaDocumentExtensions(projectId = "") {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: false,
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      defaultProtocol: "https",
      HTMLAttributes: {
        target: "_blank",
        rel: "noopener noreferrer nofollow",
      },
    }),
    Table.configure({ resizable: false, renderWrapper: true }),
    TableRow,
    TableHeader,
    TableCell,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    TaskList,
    TaskItem.configure({ nested: true }),
    AulaImage.configure({ projectId }),
    MermaidBlock,
    SlideBreak,
    AulaSearchHighlight,
  ];
}
