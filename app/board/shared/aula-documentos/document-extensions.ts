import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";
import { MermaidBlock } from "./mermaid-block";

/**
 * Extensiones del editor de Aula Documentos.
 * @returns La configuración cerrada de texto y bloques.
 */
export function createAulaDocumentExtensions() {
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
    MermaidBlock,
  ];
}
