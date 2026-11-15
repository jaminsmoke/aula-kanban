import type { DocSection } from "./types";

export const taskSections: DocSection[] = [
  {
    id: "tareas",
    title: "Trabajar con tareas",
    lead: "Dentro de Clase, la sección Tareas reúne las cuatro columnas según su estado: Por hacer, En curso, En revisión y Hecho. El panel de progreso del tablero muestra el porcentaje de tareas hechas del grupo.",
    blocks: [
      { type: "image", src: "/capturas/tareas.webp", alt: "Tablero de tareas del proyecto de demostración con las columnas Por hacer, En curso, En revisión y Hecho, y el progreso del grupo al 25 %", caption: "Proyecto de demostración con datos ficticios: tareas repartidas por estado y progreso del grupo." },
      {
        type: "steps",
        items: [
          "Crea una tarea con «Nueva tarea» o con el botón «Añadir tarea» de una columna.",
          "Arrastra una tarjeta por su asa hasta otra columna para cambiar su estado, o edita la tarea desde su tarjeta.",
          "Asigna responsables (alumnos o profesores) a cada tarea; una tarea sin asignar puede reclamarla cualquier alumno.",
          "Filtra por prioridad o por alumno y busca por título o descripción para encontrar tareas rápido.",
        ],
      },
      { type: "note", tone: "tip", text: "Con el teclado: Tab hasta el asa de la tarjeta, Espacio para levantarla, flechas para moverla y Espacio para soltarla." },
      { type: "note", tone: "info", text: "Al editar una tarea puedes cambiar su título, descripción, prioridad, responsables, fecha y estado. Los cambios se comparten con todo el grupo al instante." },
      {
        type: "steps",
        items: [
          "El diálogo de la tarea tiene tres pestañas: «Resumen» (los datos), «Asignaciones» (los responsables) y «Pizarra» (el dibujo de la tarea).",
          "En «Resumen» caben un título de hasta 120 caracteres, una descripción de hasta 2000, la prioridad (Baja, Normal o Alta) y el estado.",
          "La miniatura es opcional: pega la URL directa de una imagen o pulsa «Subir imagen desde el equipo» (PNG, JPEG, WebP o GIF, hasta 5 MB). Se ve en la tarjeta del tablero.",
          "La fecha de entrega tiene atajos «Hoy», «Mañana», «En 3 días» y «Sin fecha»; si la fecha ya pasó, el formulario lo avisa. «Guardar cambios» o «Crear tarea» confirman.",
        ],
      },
      {
        type: "definitions",
        items: [
          { term: "Asignar a toda la clase", text: "En «Asignaciones», «Asignar a toda la clase (n)» añade a todo el alumnado con ficha y «Quitar clase» los quita sin tocar al profesorado. «Añadir responsable» suma filas y cada una se puede quitar por separado." },
          { term: "Asignarme y guardar", text: "Si eres alumno y la tarea no tiene responsable, el diálogo avisa de que te la asignes para editarla y el botón pasa a ser «Asignarme y guardar»." },
          { term: "Sin responsables", text: "Mientras no haya responsables vinculados se puede escribir un nombre libre (máx. 80 caracteres); al añadir personas con ficha, ese texto deja de usarse." },
          { term: "Creada por", text: "La cabecera del diálogo y el detalle muestran «Creada por» con la cuenta que creó la tarea; si no se registró, aparece «No registrado»." },
        ],
      },
      { type: "note", tone: "warning", text: "Si la tarea cambió en otra sesión desde que abriste el diálogo, al guardar verás «Esta tarea cambió en otra sesión.» y no se sobrescribe: vuelve a abrirla para trabajar sobre la versión actual. «Eliminar» pide confirmación y borra la tarea del tablero de todo el grupo, sin papelera." },
    ],
  },
  {
    id: "calendario",
    title: "Calendario de Clase",
    lead: "Dentro de Clase, la sección Calendario coloca cada tarea en su fecha de entrega y la muestra en vista de mes, semana o agenda. Una tarea sin fecha no aparece: el calendario no inventa días.",
    blocks: [
      { type: "image", src: "/capturas/calendario.webp", alt: "Calendario de noviembre de 2026 con las fechas de entrega del proyecto de demostración", caption: "El mismo proyecto en Calendario: cada tarea en su fecha de entrega, en vista de mes." },
      {
        type: "steps",
        items: [
          "Abre Clase > Calendario en la cabecera. Arranca en vista de mes y puedes cambiar a «Semana» o «Agenda» arriba a la derecha.",
          "Muévete con «Anterior» y «Siguiente», y vuelve al mes actual con «Hoy».",
          "Pasa el puntero por una tarea para ver su título y su estado; pulsa una para abrirla. Si puedes editarla, se abre el diálogo de edición; si no, el detalle en solo lectura.",
          "Cuando un día tiene más tareas de las que caben, el calendario lo resume con «+n más» y las muestra al abrir ese día.",
        ],
      },
      { type: "note", tone: "info", text: "Cada tarea ocupa su fecha de entrega a lo largo de todo el día y lleva el color de su estado: Por hacer, En curso, En revisión o Hecho. Solo salen las tareas que tu cuenta puede ver en el proyecto." },
      { type: "note", tone: "tip", text: "¿Falta una tarea en el calendario? Casi siempre le falta la fecha: edítala, pon una fecha de entrega en «Resumen» y aparecerá. Si el periodo no tiene ninguna, el calendario avisa con «No hay tareas con fecha en este periodo.»" },
    ],
  },
  {
    id: "pizarras",
    title: "Pizarras de las tareas",
    lead: "Cada tarea tiene su propia pizarra de dibujo integrada (Excalidraw): ideal para esquemas, mapas, bocetos o anotaciones del trabajo.",
    blocks: [
      {
        type: "steps",
        items: [
          "Abre la tarea y entra en la pestaña «Pizarra» del diálogo.",
          "Dibuja o anota; la pizarra se guarda con la tarea y la ve todo el grupo.",
          "La pestaña «Pizarra» solo aparece al editar una tarea existente: no hay pizarra para una tarea que aún no se ha creado.",
        ],
      },
      { type: "note", tone: "info", text: "La pizarra de la tarea es distinta de la de Mi espacio: esta vive dentro de su tarea y comparte sus permisos. El propietario, la administración y el profesorado editan la de cualquier tarea; un alumno, solo la de una tarea sin responsable o la suya; las cuentas invitadas solo pueden mirarla (el diálogo se abre como «Detalle de la tarea»)." },
      { type: "note", tone: "tip", text: "La pizarra se comparte en directo: los demás ven tus trazos y tu puntero mientras dibujas. Si dos personas escriben a la vez, los cambios se combinan y el aviso lo indica; si falla el guardado de un trazo o una imagen, se reintenta sin perder lo dibujado." },
    ],
  },
];
