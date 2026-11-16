import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "../legal/legal-page";

export const metadata: Metadata = {
  title: "Condiciones de uso · Aula Kanban",
  description: "Condiciones de uso de Aula Kanban: cuentas, contenido, apps, disponibilidad y responsabilidad.",
  alternates: { canonical: "/condiciones" },
};

const sections: LegalSection[] = [
  {
    id: "objeto",
    title: "Objeto",
    paragraphs: [
      "Estas condiciones regulan el uso de esta instancia de Aula Kanban, un tablero colaborativo para grupos de clase, de sus apps nativas y de su plugin de ChatGPT. Al usarla aceptas estas condiciones y la política de privacidad.",
    ],
  },
  {
    id: "cuentas",
    title: "Cuentas y acceso",
    paragraphs: [
      "El acceso se hace con una cuenta de ChatGPT a través de Sites. El propietario o la administración invitan a las personas y asignan roles.",
      "Cada persona es responsable de su cuenta y de no compartir sus tokens. Los tokens del servidor MCP y OAuth son personales y se pueden revocar en cualquier momento.",
    ],
  },
  {
    id: "uso",
    title: "Uso aceptable",
    items: [
      "No uses la instancia para contenido ilícito, ofensivo o que vulnere derechos de terceros.",
      "No suplantes a otra persona ni intentes acceder a proyectos ajenos o eludir permisos.",
      "No sobrecargues el servicio ni automatices peticiones fuera de los límites del plugin y de la API.",
    ],
    closing: [
      "El profesorado responde del contenido que publica y de las fichas de su alumnado; el alumnado, del contenido que escribe.",
    ],
  },
  {
    id: "contenido",
    title: "Contenido",
    paragraphs: [
      "Conservas la propiedad del contenido que creas. Al guardarlo, autorizas a la instancia a almacenarlo y mostrarlo a las personas del proyecto y a quien tú decidas.",
      "No subas datos personales innecesarios ni material de terceros sin permiso. Los libros y las apps de terceros mantienen sus propias licencias.",
    ],
  },
  {
    id: "apps",
    title: "Apps y plugin",
    paragraphs: [
      "Las apps nativas (Excalidraw, Calculadora, Tabla periódica, Programación por bloques y Diagramas) y sus dependencias tienen sus propias licencias.",
      "El plugin de ChatGPT y el servidor MCP se ofrecen tal cual. El uso de ChatGPT se rige por sus propias condiciones.",
    ],
  },
  {
    id: "disponibilidad",
    title: "Disponibilidad y cambios",
    paragraphs: [
      "La instancia se ofrece sin garantía de disponibilidad ni de conservación. El propietario puede actualizarla, suspenderla o cerrarla, avisando cuando sea posible.",
      "Haz tus propias copias de lo que necesites conservar.",
    ],
  },
  {
    id: "responsabilidad",
    title: "Responsabilidad",
    paragraphs: [
      "En la medida permitida por la ley, el propietario no responde de daños indirectos, pérdida de datos o interrupciones del servicio. Nada de esto limita los derechos que la ley reconozca a la persona consumidora.",
      "Aula Kanban no sustituye la supervisión docente ni el criterio del centro.",
    ],
  },
  {
    id: "ley",
    title: "Ley aplicable y contacto",
    paragraphs: [
      "Estas condiciones se rigen por la legislación española. Para cualquier duda, escribe a jorgemd@siberia.solutions.",
    ],
  },
];

/**
 * Página pública de condiciones de uso.
 * @returns Las condiciones de uso de esta instancia.
 */
export default function TermsPage() {
  return (
    <LegalPage
      title="Condiciones de uso"
      lead="Cómo se usa esta instancia de Aula Kanban, qué puedes esperar del servicio y qué responsabilidades acompañan a cada cuenta."
      updatedIso="2026-11-16"
      updatedLabel="16 de noviembre de 2026"
      current="condiciones"
      sections={sections}
    />
  );
}
