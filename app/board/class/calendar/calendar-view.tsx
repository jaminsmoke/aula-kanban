"use client";

import { useMemo } from "react";
import { Calendar, dateFnsLocalizer, type Event } from "react-big-calendar";
import { format, getDay, parse, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import "react-big-calendar/lib/css/react-big-calendar.css";
import type { Task } from "../../../../lib/domain/task";
import { columns } from "../../shared/model";
import "./calendar-view.css";

const localizer = dateFnsLocalizer({ format, getDay, parse, startOfWeek, locales: { es } });

type CalendarTask = Event & { id: string; status: Task["status"] };

const messages = {
  today: "Hoy",
  month: "Mes",
  week: "Semana",
  agenda: "Agenda",
  next: "Siguiente",
  previous: "Anterior",
  date: "Fecha",
  time: "Hora",
  event: "Tarea",
  noEventsInRange: "No hay tareas con fecha en este periodo.",
  showMore: (total: number) => `+${total} más`,
} as const;

/**
 * Sección Calendario de Clase: las tareas del proyecto colocadas en su
 * fecha de vencimiento. Integra `react-big-calendar` (MIT) con el localizer
 * de `date-fns`; una tarea sin `dueDate` no se inventa fecha y no aparece.
 * @param props - Tareas visibles para la cuenta, estado de carga y apertura de tarea.
 * @returns El calendario, o el aviso de carga/estado vacío cuando corresponde.
 */
export default function CalendarView({ tasks, loadError, onRetry, onOpenTask }: {
  tasks: Task[] | null;
  loadError: string;
  onRetry: () => void;
  onOpenTask: (task: Task) => void;
}) {
  const events = useMemo<CalendarTask[]>(
    () => (tasks ?? [])
      .filter((task) => task.dueDate)
      .map((task) => {
        const start = new Date(`${task.dueDate}T00:00:00`);
        return { id: task.id, title: task.title, status: task.status, start, end: start, allDay: true };
      }),
    [tasks],
  );

  if (tasks === null) {
    return <div className="class-calendar-empty" role="status">{loadError ? <>No se pudieron cargar las tareas. <button type="button" className="text-button" onClick={onRetry}>Reintentar</button></> : "Cargando el calendario…"}</div>;
  }

  return (
    <div className="class-calendar" role="region" aria-label="Calendario de tareas">
      <header className="class-calendar-head">
        <h2><CalendarDays size={18} aria-hidden /> Calendario</h2>
        <p>Las tareas aparecen en su fecha de vencimiento. Pulsa una para abrirla.</p>
      </header>
      {events.length === 0 && (
        <p className="class-calendar-note">Todavía no hay tareas con fecha. Añade una fecha de vencimiento al editar una tarea y aparecerá aquí.</p>
      )}
      <Calendar<CalendarTask>
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        allDayAccessor="allDay"
        culture="es"
        defaultView="month"
        views={["month", "week", "agenda"]}
        messages={messages}
        eventPropGetter={(event) => ({ className: `status-${event.status}` })}
        tooltipAccessor={(event) => `${event.title} · ${columns[event.status].name}`}
        onSelectEvent={(event) => {
          const task = tasks.find((item) => item.id === event.id);
          if (task) onOpenTask(task);
        }}
      />
    </div>
  );
}
