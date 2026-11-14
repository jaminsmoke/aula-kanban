/** Plantilla de diagrama Mermaid. */
export type MermaidTemplate = { id: string; label: string; code: string };

export const MERMAID_TEMPLATES: MermaidTemplate[] = [
  {
    id: "flujo",
    label: "Diagrama de flujo",
    code: `flowchart TD
  A[Inicio] --> B{¿Hay tarea?}
  B -- Sí --> C[Trabajar]
  B -- No --> D[Descansar]
  C --> E[Entregar]
  D --> E
  E --> F[Fin]`,
  },
  {
    id: "secuencia",
    label: "Diagrama de secuencia",
    code: `sequenceDiagram
  participant A as Alumno
  participant P as Profesor
  A->>P: ¿Puedo entregar mañana?
  P-->>A: Sí, hasta las 20:00
  A->>P: Gracias`,
  },
  {
    id: "gantt",
    label: "Gantt",
    code: `gantt
  title Plan de proyecto
  dateFormat YYYY-MM-DD
  section Investigación
  Buscar fuentes   :a1, 2026-01-10, 5d
  Redactar         :a2, after a1, 7d
  section Entrega
  Revisar          :a3, after a2, 3d
  Presentar        :a4, after a3, 1d`,
  },
  {
    id: "clases",
    label: "Diagrama de clases",
    code: `classDiagram
  class Tarea {
    +String titulo
    +String estado
    +mover()
  }
  class Alumno {
    +String nombre
    +entregar()
  }
  Alumno "1" --> "*" Tarea : tiene`,
  },
  {
    id: "estados",
    label: "Estados",
    code: `stateDiagram-v2
  [*] --> Pendiente
  Pendiente --> EnCurso : empezar
  EnCurso --> Hecho : terminar
  Hecho --> [*]`,
  },
  {
    id: "tiempo",
    label: "Línea de tiempo",
    code: `timeline
  title Historia del aula
  2020 : Se crea el proyecto
  2022 : Primeros talleres
  2024 : Exposición final`,
  },
];
