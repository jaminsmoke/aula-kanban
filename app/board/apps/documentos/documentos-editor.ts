import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";

/**
 * Extensiones compartidas por el editor y sus pruebas.
 * @returns La configuración cerrada de formatos de la primera versión.
 */
export function createDocumentExtensions() {
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
  ];
}
