"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCorners, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ArrowDown, ClipboardList, Flag, GripVertical, ListFilter, Plus, Search, Users } from "lucide-react";
import { priorities, priorityNames, statuses } from "../../../lib/domain/task";
import type { Task, TaskFields } from "../../../lib/domain/task";
import type { Student } from "../../../lib/domain/student";
import SortableTaskCard from "./sortable-task-card";
import { columns } from "../shared/model";
import "./kanban.css";

/**
 * Una columna del tablero: zona de destino con sus tarjetas ordenables.
 * @param props - Estado, tarjetas visibles, destino resaltado, permisos y acciones.
 * @returns La columna con su cabecera y cuerpo.
 */
function Lane({ status, cards, destination, isGuest, filtered, tasksNull, loadError, saving, dragged, canEditTask, canGrabTask, onOpenEditor }: {
  status: TaskFields["status"];
  cards: Task[];
  destination: TaskFields["status"] | null;
  isGuest: boolean;
  filtered: boolean;
  tasksNull: boolean;
  loadError: string;
  saving: boolean;
  dragged: string | null;
  canEditTask: (task: Task) => boolean;
  canGrabTask: (task: Task) => boolean;
  onOpenEditor: (status: TaskFields["status"], task?: Task) => void;
}) {
  const { name, icon: Icon } = columns[status];
  const { setNodeRef } = useDroppable({ id: `lane:${status}` });
  return (
    <section ref={setNodeRef} className={`lane ${status}${destination === status ? " drop-target" : ""}`} aria-label={name}>
      <div className="lane-header">
        <span className="lane-icon"><Icon size={16} strokeWidth={2} /></span>
        <h3>{name}</h3><span className="count">{cards.length}</span>
        {!isGuest && <button className="icon-button lane-add" type="button" disabled={saving || tasksNull} aria-label={`Añadir tarea a ${name}`} onClick={() => onOpenEditor(status)}><Plus size={16} /></button>}
      </div>
      <div className="lane-body">
        <SortableContext items={cards.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          {cards.map((task) => <SortableTaskCard key={task.id} task={task} dragging={dragged === task.id} editable={canEditTask(task)} disabled={!canGrabTask(task) || saving} onEdit={() => onOpenEditor(task.status, task)} />)}
        </SortableContext>
        {cards.length === 0 && (
          <div className="empty">
            <span className="empty-icon"><ClipboardList size={20} strokeWidth={2} /></span>
            <span>{tasksNull ? (loadError ? "Tablero no disponible" : "Cargando…") : filtered ? "Sin coincidencias" : "Sin tareas"}</span>
          </div>
        )}
        {!isGuest && <button type="button" className="lane-create" disabled={saving || tasksNull} onClick={() => onOpenEditor(status)}><Plus size={16} /> Añadir tarea</button>}
      </div>
    </section>
  );
}

/**
 * Vista Kanban con hero, progreso, filtros y las cuatro columnas.
 * @param props - Tareas visibles, filtros, estado de carga y acciones de edición y arrastre.
 * @returns La vista completa del tablero.
 */
export default function KanbanView({
  tasks, visible, students, search, filter, studentFilter, onSearch, onFilter, onStudentFilter, onClearFilters,
  loadError, onRetry, saving, isGuest, filtered, dragged, destination, canEditTask, canGrabTask, onOpenEditor,
  onDragStart, onDragOver, onDragEnd, onDragCancel, finished, total, progress,
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
  onClearFilters: () => void;
  loadError: string;
  onRetry: () => void;
  saving: boolean;
  isGuest: boolean;
  filtered: boolean;
  dragged: string | null;
  destination: TaskFields["status"] | null;
  canEditTask: (task: Task) => boolean;
  canGrabTask: (task: Task) => boolean;
  onOpenEditor: (status: TaskFields["status"], task?: Task) => void;
  onDragStart: (event: DragStartEvent) => void;
  onDragOver: (event: DragOverEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onDragCancel: () => void;
  finished: number;
  total: number;
  progress: number;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function clearFilters() {
    onClearFilters();
    window.setTimeout(() => document.querySelector<HTMLInputElement>('input[aria-label="Buscar tareas"]')?.focus(), 0);
  }
  return (
    <>
      <section className="hero" aria-labelledby="board-title">
        <h1 id="board-title">Tablero de tareas</h1>
        <div className="hero-progress">
          <span className="hero-progress-meta">
            <strong><Flag size={16} aria-hidden /> {progress} %</strong>
            <span>{finished} de {total} {total === 1 ? "tarea hecha" : "tareas hechas"}</span>
          </span>
          <progress aria-label="Progreso del grupo" max={100} value={progress} />
        </div>
        {!isGuest && <button className="primary" type="button" disabled={saving || tasks === null} onClick={() => onOpenEditor("pending")}><Plus size={18} /> Nueva tarea</button>}
      </section>
      <section className="workspace" aria-label="Columnas del tablero">
        <div className="toolbar">
          <div className="controls">
            <label className="search"><Search size={16} /><input type="search" aria-label="Buscar tareas" placeholder="Buscar tareas…" value={search} onChange={(event) => onSearch(event.target.value)} /></label>
            <label className="filter"><ListFilter size={16} /><select value={filter} aria-label="Filtrar por prioridad" onChange={(event) => onFilter(event.target.value)}>
              <option value="">Todas las prioridades</option>
              {priorities.map((priority) => <option key={priority} value={priority}>{priorityNames[priority]}</option>)}
            </select><ArrowDown size={12} aria-hidden /></label>
            <label className="filter"><Users size={16} /><select value={studentFilter} aria-label="Filtrar por alumno" onChange={(event) => onStudentFilter(event.target.value)}>
              <option value="">Todos los alumnos</option>
              {students?.map((student) => <option key={student.section} value={student.section}>{student.displayName || student.name}</option>)}
            </select><ArrowDown size={12} aria-hidden /></label>
          </div>
        </div>
        {loadError && <div role="alert" className="alert">{loadError} <button type="button" className="text-button" onClick={onRetry}>Reintentar</button></div>}
        {filtered && visible.length === 0 && !loadError && tasks !== null && (
          <div className="filter-empty" role="status">
            <span>Sin coincidencias para los filtros actuales.</span>
            <button type="button" className="secondary" onClick={clearFilters}>Limpiar filtros</button>
          </div>
        )}
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={onDragCancel}>
          <div className="board" aria-busy={tasks === null && !loadError}>
            {statuses.map((status) => (
              <Lane key={status} status={status} cards={visible.filter((task) => task.status === status)} destination={destination} isGuest={isGuest} filtered={filtered} tasksNull={tasks === null} loadError={loadError} saving={saving} dragged={dragged} canEditTask={canEditTask} canGrabTask={canGrabTask} onOpenEditor={onOpenEditor} />
            ))}
          </div>
        </DndContext>
        <footer className="board-footer"><span><GripVertical size={16} /> Arrastra una tarjeta por su asa o muévela con el teclado, o cambia su estado al editarla.</span><span className="sync"><i /> {loadError ? "Sin conexión" : tasks === null ? "Conectando…" : "Tablero compartido"}</span></footer>
      </section>
    </>
  );
}
