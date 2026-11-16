import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "../legal/legal-page";

export const metadata: Metadata = {
  title: "Privacidad · Aula Kanban",
  description: "Qué datos guarda esta instancia de Aula Kanban, para qué se usan y cómo ejercer tus derechos.",
  alternates: { canonical: "/privacidad" },
};

const sections: LegalSection[] = [
  {
    id: "responsable",
    title: "Quién trata tus datos",
    paragraphs: [
      "Esta instancia de Aula Kanban la mantiene SiberIA Solutions (autónomo), que es la responsable de los datos que se guardan aquí. Cada copia o remix de Aula Kanban tiene su propio responsable: esta página describe solo esta instancia.",
      "Para cualquier cuestión de privacidad puedes escribir a jorgemd@siberia.solutions.",
    ],
  },
  {
    id: "datos",
    title: "Qué datos guarda",
    paragraphs: [
      "Aula Kanban guarda solo lo necesario para el tablero y las herramientas del aula. No hay analítica, publicidad ni cookies de terceros.",
      "La demo pública no usa datos reales: abre un proyecto ficticio con alumnado inventado y no guarda nada de la visita.",
    ],
    items: [
      "Identidad de la cuenta: el identificador estable, el correo y el nombre visible que Sites envía al iniciar sesión. No se guardan contraseñas.",
      "Proyectos y miembros: nombre del proyecto, correo de invitación, rol, estado de la invitación y vínculo con la ficha de alumno o profesor.",
      "Tareas: título, descripción, fecha de entrega, prioridad, estado, imagen adjunta, creador y personas responsables.",
      "Fichas de alumnos y profesores: nombre, nombre visible, puesto o rol, actividades y ayuda con IA. El correo solo si se invita a la ficha; las fichas borradas conservan nombre, identificador y fecha de baja.",
      "Archivos: imágenes y documentos que se suben al proyecto, con su tipo, tamaño, finalidad y fecha. Se guardan en el almacenamiento de objetos de la instancia.",
      "Pizarras y documentos de apps: la instantánea de Excalidraw y el estado de los documentos de Diagramas y Programación por bloques.",
      "Preferencias: apps favoritas, orden y carpeta personal por cuenta y proyecto. El tema claro u oscuro se guarda solo en el navegador.",
      "Tokens de acceso: los tokens personales del servidor MCP y los tokens OAuth se guardan como hash con sal, con etiqueta y fechas. El secreto completo solo se muestra al crearlo.",
      "Registro de auditoría del MCP: cuenta, herramienta, proyecto, resultado, duración y fecha de cada llamada.",
    ],
  },
  {
    id: "finalidad",
    title: "Para qué se usan",
    items: [
      "Prestar el servicio: mostrar el tablero, el calendario, las fichas, las apps y la documentación.",
      "Comprobar permisos, separar proyectos y sincronizar pizarras y documentos entre las personas del proyecto.",
      "Mantener la seguridad de los tokens y del registro de auditoría, y diagnosticar errores.",
    ],
    closing: [
      "No se usan para publicidad, elaboración de perfiles ni cesión a terceros con otros fines.",
    ],
  },
  {
    id: "ubicacion",
    title: "Dónde se guardan y quién accede",
    paragraphs: [
      "El contenido vive en la infraestructura de Cloudflare que aloja esta instancia: base de datos D1 para el contenido y almacenamiento R2 para los archivos. La sesión la gestiona Sites y ChatGPT.",
      "Acceden las personas miembros del proyecto según su rol, y el propietario o la administración de la instancia. Otras instancias de Aula Kanban no tienen acceso. El proveedor de alojamiento trata los datos como encargado, según sus condiciones.",
    ],
  },
  {
    id: "conservacion",
    title: "Cuánto tiempo se conservan",
    items: [
      "Mientras existan la instancia y el proyecto. Al borrar una ficha se conserva un registro mínimo (nombre, identificador y fecha) para no reutilizar la sección.",
      "Los tokens revocados y el registro de auditoría se conservan para poder investigar accesos; también puedes pedir su supresión.",
      "Las copias de seguridad siguen la política de Cloudflare y del propietario de la instancia.",
    ],
  },
  {
    id: "derechos",
    title: "Tus derechos",
    paragraphs: [
      "Puedes pedir acceso, rectificación, supresión, limitación, oposición y portabilidad, y retirar el consentimiento, escribiendo a jorgemd@siberia.solutions.",
      "Si no estás conforme con la respuesta, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es). Para tramitar una solicitud, indica la cuenta y el proyecto; no envíes contraseñas ni tokens.",
    ],
  },
  {
    id: "menores",
    title: "Menores y uso en el aula",
    paragraphs: [
      "Aula Kanban se usa en clase bajo la supervisión del profesorado. Las cuentas son de ChatGPT y Sites, y las crea o invita el centro o el propietario de la instancia.",
      "Las fichas de alumnado las rellena el profesorado; no se piden más datos que los necesarios para organizar el grupo y las tareas.",
    ],
  },
  {
    id: "cambios",
    title: "Cambios en esta política",
    paragraphs: [
      "Si cambia el tratamiento o el esquema de datos, actualizaremos esta página y la fecha de arriba. El uso continuado después del cambio implica aceptar la versión publicada.",
    ],
  },
];

/**
 * Página pública de privacidad.
 * @returns El documento de privacidad de esta instancia.
 */
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacidad"
      lead="Qué datos guarda esta instancia de Aula Kanban, para qué se usan, dónde viven y cómo puedes ejercer tus derechos."
      updatedIso="2026-11-16"
      updatedLabel="16 de noviembre de 2026"
      current="privacidad"
      sections={sections}
    />
  );
}
