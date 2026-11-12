"use client";

import { ArrowDown, ClipboardList, Columns3, Flag, GripVertical, ListFilter, Plus, Search, Users } from "lucide-react";
import { priorities, priorityNames, statuses } from "../task";
import type { Task, TaskFields } from "../task";
import type { Student } from "../student";
import TaskCard from "./task-card";
import type { GripEvent } from "./task-card";
import { columns } from "./model";

export default function KanbanView({
  tasks, visible, students, search, filter, studentFilter, onSearch, onFilter, onStudentFilter,
  loadError, onRetry, saving, isGuest, filtered, dragged, destination, canEditTask, onOpenEditor,
  onGrab, onMove, onRelease, onCancelDrag, finished, total, progress,
}: {
  tasks: Task[] | null;
  visible: Task[];
  students: Student[] | null;
  search: string;
  filter: string;
  studentFilter: string;
  onSearch: (value: string) => void;
  onFilter: (value: string) => void;
  onStudentFilter: (value: string) => void;
  loadError: string;
  onRetry: () => void;
  saving: boolean;
  isGuest: boolean;
  filtered: boolean;
  dragged: string | null;
  destination: TaskFields["status"] | null;
  canEditTask: (task: Task) => boolean;
  onOpenEditor: (status: TaskFields["status"], task?: Task) => void;
  onGrab: (event: GripEvent, task: Task) => void;
  onMove: (event: GripEvent) => void;
  onRelease: (event: GripEvent) => void;
  onCancelDrag: () => void;
  finished: number;
  total: number;
  progress: number;
}) {
  return (
    <>
      <section className="hero" aria-labelledby="board-title">
        <div className="hero-content">
          <p className="eyebrow"><span /> Grupo de clase</p>
          <h1 id="board-title">Tablero de tareas</h1>
          <p className="intro">Organizad el trabajo y seguid el avance de cada tarea.</p>
          {!isGuest && <button className="primary" type="button" disabled={saving || tasks === null} onClick={() => onOpenEditor("pending")}><Plus size={19} /> Nueva tarea</button>}
        </div>
        <div className="progress-panel">
          <span className="progress-label"><Flag size={15} /> Progreso del grupo</span>
          <div className="progress-value"><strong>{progress}<span>%</span></strong><span>{finished} de {total} {total === 1 ? "tarea hecha" : "tareas hechas"}</span></div>
          <progress aria-label="Progreso del grupo" max={100} value={progress} />
        </div>
      </section>
      <section className="workspace" aria-label="Columnas del tablero">
        <div className="toolbar">
          <h2><Columns3 size={18} /> Kanban</h2>
          <div className="controls">
            <label className="search"><Search size={17} /><input type="search" aria-label="Buscar tareas" placeholder="Buscar tareas…" value={search} onChange={(event) => onSearch(event.target.value)} /></label>
            <label className="filter"><ListFilter size={17} /><select value={filter} aria-label="Filtrar por prioridad" onChange={(event) => onFilter(event.target.value)}>
              <option value="">Todas las prioridades</option>
              {priorities.map((priority) => <option key={priority} value={priority}>{priorityNames[priority]}</option>)}
            </select><ArrowDown size={13} aria-hidden /></label>
            <label className="filter"><Users size={17} /><select value={studentFilter} aria-label="Filtrar por alumno" onChange={(event) => onStudentFilter(event.target.value)}>
              <option value="">Todos los alumnos</option>
              {students?.map((student) => <option key={student.section} value={student.section}>{student.displayName}</option>)}
            </select><ArrowDown size={13} aria-hidden /></label>
          </div>
        </div>
        {loadError && <div role="alert" className="alert">{loadError} <button type="button" className="text-button" onClick={onRetry}>Reintentar</button></div>}
        <div className="board" aria-busy={tasks === null && !loadError}>
          {statuses.map((status) => {
            const { name, icon: Icon } = columns[status];
            const cards = visible.filter((task) => task.status === status);
            return (
              <section key={status} className={`lane ${status}${destination === status ? " drop-target" : ""}`} aria-label={name} data-lane={status}>
                <div className="lane-header">
                  <span className="lane-icon"><Icon size={16} strokeWidth={2.25} /></span>
                  <h3>{name}</h3><span className="count">{cards.length}</span>
                  {!isGuest && <button className="icon-button lane-add" type="button" disabled={saving || tasks === null} aria-label={`Añadir tarea a ${name}`} onClick={() => onOpenEditor(status)}><Plus size={17} /></button>}
                </div>
                <div className="lane-body">
                  {cards.map((task) => <TaskCard key={task.id} task={task} dragging={dragged === task.id} editable={canEditTask(task)}
                    onEdit={() => onOpenEditor(task.status, task)}
                    onGrab={(event) => onGrab(event, task)} onMove={onMove} onRelease={onRelease} onCancel={onCancelDrag} />)}
                  {cards.length === 0 && (
                    <div className="empty">
                      <span className="empty-icon"><ClipboardList size={20} strokeWidth={1.6} /></span>
                      <span>{tasks === null ? (loadError ? "Tablero no disponible" : "Cargando…") : filtered ? "Sin coincidencias" : "Sin tareas"}</span>
                    </div>
                  )}
                  {!isGuest && <button type="button" className="lane-create" disabled={saving || tasks === null} onClick={() => onOpenEditor(status)}><Plus size={16} /> Añadir tarea</button>}
                </div>
              </section>
            );
          })}
        </div>
        <footer className="board-footer"><span><GripVertical size={16} /> Arrastra una tarjeta por su asa o cambia su estado al editarla.</span><span className="sync"><i /> {loadError ? "Sin conexión" : tasks === null ? "Conectando…" : "Tablero compartido"}</span></footer>
      </section>
    </>
  );
}
