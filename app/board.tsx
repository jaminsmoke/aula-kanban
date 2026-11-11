"use client";

import {
  ArrowDown, ArrowRight, CalendarDays, Check, CircleCheck, CircleDashed, ClipboardList,
  Clock3, Columns3, Flag, GripVertical, Link2, ListFilter, Plus, ScanEye, Search, Trash2, X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, PointerEvent, ReactNode } from "react";
import { priorities, priorityNames, statuses } from "./task";
import type { Task, TaskFields } from "./task";
import type { Student } from "./student";

const columns = {
  pending: { name: "Por hacer", icon: CircleDashed },
  active: { name: "En curso", icon: Clock3 },
  review: { name: "En revisión", icon: ScanEye },
  done: { name: "Hecho", icon: CircleCheck },
};
const blank: TaskFields = {
  title: "", description: "", assignee: "", dueDate: "", priority: "normal", status: "pending",
};
const formatDate = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" });

class RequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function request<T>(method = "GET", body?: unknown, path = "/api/tasks"): Promise<T> {
  const response = await fetch(path, {
    method,
    cache: "no-store",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || data === null) {
    const message = data && typeof data === "object" && "message" in data && typeof data.message === "string"
      ? data.message : "No se pudo conectar con el tablero. Inténtalo de nuevo.";
    throw new RequestError(message, response.status);
  }
  return data as T;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return (
    <dialog ref={ref} aria-label={title} onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <div className="modal-header">
        <h2>{title}</h2>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
      </div>
      {children}
    </dialog>
  );
}

type GripEvent = PointerEvent<HTMLSpanElement>;

function TaskCard({ task, dragging, onEdit, onGrab, onMove, onRelease, onCancel }: {
  task: Task;
  dragging: boolean;
  onEdit: () => void;
  onGrab: (event: GripEvent) => void;
  onMove: (event: GripEvent) => void;
  onRelease: (event: GripEvent) => void;
  onCancel: () => void;
}) {
  const initials = task.assignee.trim().split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0]).join("").toUpperCase();
  return (
    <button type="button" className={dragging ? "card dragging" : "card"} onClick={onEdit}>
      <span className="card-top">
        <span className={`priority ${task.priority}`}><Flag size={12} /> {priorityNames[task.priority]}</span>
        <span className="grip" aria-hidden
          onPointerDown={onGrab} onPointerMove={onMove} onPointerUp={onRelease}
          onPointerCancel={onCancel} onLostPointerCapture={onCancel}
          onClick={(event) => event.stopPropagation()}>
          <GripVertical size={17} />
        </span>
      </span>
      <strong>{task.title}</strong>
      {task.description && <span className="card-description">{task.description}</span>}
      {(task.assignee || task.dueDate) && (
        <span className="card-meta">
          {task.assignee && <span className="assignee" title={task.assignee}><span className="avatar">{initials}</span><span>{task.assignee}</span></span>}
          {task.dueDate && <span className="date"><CalendarDays size={14} /> <time dateTime={task.dueDate}>{formatDate.format(new Date(task.dueDate + "T12:00:00"))}</time></span>}
        </span>
      )}
    </button>
  );
}

export default function Board() {
  const [view, setView] = useState<"kanban" | "alumnos">("kanban");
  const [studentName, setStudentName] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[] | null>(null);
  const [studentError, setStudentError] = useState("");
  const [studentForm, setStudentForm] = useState<Student | null>(null);
  const [studentFormError, setStudentFormError] = useState("");
  const [studentSaving, setStudentSaving] = useState(false);
  const studentWriting = useRef(false);
  const studentReadVersion = useRef(0);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [editor, setEditor] = useState<{ task?: Task; status: TaskFields["status"] } | null>(null);
  const [form, setForm] = useState<TaskFields>(blank);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [dragged, setDragged] = useState<string | null>(null);
  const drag = useRef<{ task: Task; x: number; y: number; started: boolean } | null>(null);
  const [destination, setDestination] = useState<TaskFields["status"] | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const writing = useRef(false);
  const readVersion = useRef(0);

  const refresh = useCallback(async () => {
    if (writing.current) return;
    const version = ++readVersion.current;
    try {
      const next = await request<Task[]>();
      if (version !== readVersion.current) return;
      setTasks(next);
      setLoadError("");
    } catch (error) {
      if (version === readVersion.current) setLoadError((error as Error).message);
    }
  }, []);

  const refreshStudents = useCallback(async () => {
    if (studentWriting.current) return;
    const version = ++studentReadVersion.current;
    try {
      const next = await request<Student[]>("GET", undefined, "/api/students");
      if (version !== studentReadVersion.current) return;
      setStudents(next);
      setStudentError("");
    } catch (error) {
      if (version === studentReadVersion.current) setStudentError((error as Error).message);
    }
  }, []);

  async function saveStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!studentForm || studentWriting.current) return;
    studentWriting.current = true;
    ++studentReadVersion.current;
    setStudentSaving(true);
    setStudentFormError("");
    try {
      const updated = await request<Student>("PATCH", studentForm, "/api/students");
      setStudents((previous) => previous?.map((student) => student.section === updated.section ? updated : student) ?? [updated]);
      setStudentForm(null);
      setNotice("Perfil actualizado.");
    } catch (error) {
      setStudentFormError((error as Error).message);
    } finally {
      studentWriting.current = false;
      setStudentSaving(false);
      void refreshStudents();
    }
  }

  useEffect(() => {
    void refresh();
    void refreshStudents();
    const timer = window.setInterval(() => { if (!document.hidden) { void refresh(); void refreshStudents(); } }, 8000);
    window.addEventListener("focus", refresh);
    window.addEventListener("focus", refreshStudents);
    return () => {
      ++readVersion.current;
      ++studentReadVersion.current;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("focus", refreshStudents);
    };
  }, [refresh, refreshStudents]);

  function openEditor(status: TaskFields["status"], task?: Task) {
    if (writing.current) return;
    setForm(task ?? { ...blank, status });
    setFormError("");
    setDeleting(false);
    setEditor({ task, status });
  }

  async function mutate(method: string, body: unknown, message: string, fromEditor: boolean) {
    if (writing.current) return;
    writing.current = true;
    ++readVersion.current;
    setSaving(true);
    setFormError("");
    setNotice("");
    try {
      const result = await request<Task>(method, body);
      setTasks((previous) => {
        const others = (previous ?? []).filter((task) => task.id !== result.id);
        return method === "DELETE" ? others : [...others, result].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
      });
      if (fromEditor) setEditor(null);
      setNotice(message);
    } catch (error) {
      if (fromEditor) setFormError((error as Error).message);
      else setNotice((error as Error).message);
    } finally {
      writing.current = false;
      setSaving(false);
      void refresh();
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim()) {
      setFormError("Escribe un título para la tarea.");
      return;
    }
    const task = editor?.task;
    const matches = (students ?? []).filter((student) =>
      student.displayName.localeCompare(form.assignee.trim(), "es", { sensitivity: "base" }) === 0,
    );
    const fields = matches.length === 1 ? { ...form, assignee: matches[0].name } : form;
    if (task) {
      void mutate("PATCH", { id: task.id, revision: task.revision, changes: fields }, "Cambios guardados.", true);
    } else {
      void mutate("POST", fields, "Tarea creada.", true);
    }
  }

  function laneAt(event: GripEvent) {
    const lane = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-lane]");
    return (lane?.dataset.lane as TaskFields["status"] | undefined) ?? null;
  }

  function grab(event: GripEvent, task: Task) {
    if (!event.isPrimary || event.button !== 0 || writing.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { task, x: event.clientX, y: event.clientY, started: false };
  }

  function move(event: GripEvent) {
    const current = drag.current;
    if (!current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    if (!current.started && Math.hypot(event.clientX - current.x, event.clientY - current.y) < 5) return;
    current.started = true;
    setDragged(current.task.id);
    const status = laneAt(event);
    setDestination(status === current.task.status ? null : status);
  }

  function cancelDrag() {
    drag.current = null;
    setDestination(null);
    setDragged(null);
  }

  function release(event: GripEvent) {
    const current = drag.current;
    if (!current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const status = laneAt(event);
    cancelDrag();
    if (current.started && status && current.task.status !== status) {
      const { id, revision } = current.task;
      void mutate("PATCH", { id, revision, changes: { status } }, `Tarea movida a «${columns[status].name}».`, false);
    }
  }

  const all = tasks ?? [];
  const total = all.length;
  const finished = all.filter((task) => task.status === "done").length;
  const progress = total ? Math.round(finished / total * 100) : 0;
  const query = search.trim().toLocaleLowerCase("es");
  const visible = all.filter((task) => {
    const haystack = [task.title, task.description, task.assignee].join(" ").toLocaleLowerCase("es");
    return (!filter || task.priority === filter) && haystack.includes(query);
  });
  const filtered = Boolean(query || filter);

  return (
    <>
      <header className="topbar">
        <div className="shell topbar-inner">
          <span className="wordmark"><span className="brand-icon"><Columns3 size={20} strokeWidth={2.6} /></span>Aula Kanban</span>
          <nav className="main-nav" aria-label="Vistas">
            <button type="button" aria-current={view === "kanban" ? "page" : undefined} onClick={() => setView("kanban")}>Kanban</button>
            <button type="button" aria-current={view === "alumnos" ? "page" : undefined} onClick={() => { setView("alumnos"); setStudentName(null); }}>Alumnos</button>
          </nav>
          <button type="button" className="secondary share" onClick={() => {
            setCopied(false);
            setShareUrl(window.location.origin + "/");
          }}><Link2 size={17} /> Compartir</button>
        </div>
      </header>

      <main className="shell">
        {view === "alumnos" ? (
          <section className="students-view">
            <p className="eyebrow"><span /> Grupo de clase</p>
            <h1>Alumnos</h1>
            <p className="intro">Fichas del grupo y tareas asignadas.</p>
            {loadError && <div role="alert" className="alert">{loadError} <button type="button" className="text-button" onClick={() => void refresh()}>Reintentar</button></div>}
            {studentError && <div role="alert" className="alert">{studentError} <button type="button" className="text-button" onClick={() => void refreshStudents()}>Reintentar</button></div>}
            {studentName ? (() => {
              const student = students?.find((item) => item.section === studentName);
              if (!student) return null;
              const normalize = (value: string) => value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
              const firstName = student.name.split(/\s+/)[0];
              const firstNameUnique = (students ?? []).filter((item) => normalize(item.name.split(/\s+/)[0]) === normalize(firstName)).length === 1;
              const displayNameUnique = (students ?? []).filter((item) => normalize(item.name) === normalize(student.displayName) || normalize(item.displayName) === normalize(student.displayName)).length === 1;
              const assigned = all.filter((task) => normalize(task.assignee) === normalize(student.name) || (displayNameUnique && normalize(task.assignee) === normalize(student.displayName)) || (firstNameUnique && normalize(task.assignee) === normalize(firstName)));
              return <div className="student-detail">
                <button className="text-button back-link" onClick={() => setStudentName(null)}>← Todos los alumnos</button>
                <h2>{student.displayName}</h2>
                <button type="button" className="secondary" onClick={() => { setStudentForm(student); setStudentFormError(""); }}>Editar perfil</button>
                <div className="student-info"><p>Puesto de trabajo: {student.role || "Sin especificar"}</p><p>Actividades cotidianas: {student.activities || "Sin especificar"}</p><p>Ayuda de la IA: {student.aiHelp || "Sin especificar"}</p></div>
                <h3>Sus tareas <span>({assigned.length})</span></h3>
                {tasks === null ? <p>Cargando tareas…</p> : assigned.length ? assigned.map((task) => <button className="student-task" key={task.id} onClick={() => openEditor(task.status, task)}>
                  <span><strong>{task.title}</strong>{task.dueDate && <small>Entrega {formatDate.format(new Date(task.dueDate + "T12:00:00"))}</small>}</span>
                  <span className={"student-status " + task.status}>{columns[task.status].name}</span>
                </button>) : <p className="intro">Todavía no tiene tareas asignadas.</p>}
              </div>;
            })() : <div className="students-grid">
              {students === null && <p>{studentError ? "No se pudieron cargar las fichas." : "Cargando fichas…"}</p>}
              {students?.map((student) => <button type="button" className="student-card" key={student.section} onClick={() => setStudentName(student.section)}>
                <span className="student-avatar">{student.displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
                <span><strong>{student.displayName}</strong><small>{student.role}</small></span>
                <ArrowRight size={17} />
              </button>)}
            </div>}
          </section>
        ) : <>
        <section className="hero" aria-labelledby="board-title">
          <div className="hero-content">
            <p className="eyebrow"><span /> Grupo de clase</p>
            <h1 id="board-title">Tablero de tareas</h1>
            <p className="intro">Organizad el trabajo y seguid el avance de cada tarea.</p>
            <button className="primary" type="button" disabled={saving || tasks === null} onClick={() => openEditor("pending")}><Plus size={19} /> Nueva tarea</button>
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
              <label className="search"><Search size={17} /><input type="search" aria-label="Buscar tareas" placeholder="Buscar tareas…" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
              <label className="filter"><ListFilter size={17} /><select value={filter} aria-label="Filtrar por prioridad" onChange={(event) => setFilter(event.target.value)}>
                <option value="">Todas las prioridades</option>
                {priorities.map((priority) => <option key={priority} value={priority}>{priorityNames[priority]}</option>)}
              </select><ArrowDown size={13} aria-hidden /></label>
            </div>
          </div>
          {loadError && <div role="alert" className="alert">{loadError} <button type="button" className="text-button" onClick={() => void refresh()}>Reintentar</button></div>}
          <div className="board" aria-busy={tasks === null && !loadError}>
            {statuses.map((status) => {
              const { name, icon: Icon } = columns[status];
              const cards = visible.filter((task) => task.status === status);
              return (
                <section key={status} className={`lane ${status}${destination === status ? " drop-target" : ""}`} aria-label={name} data-lane={status}>
                  <div className="lane-header">
                    <span className="lane-icon"><Icon size={16} strokeWidth={2.25} /></span>
                    <h3>{name}</h3><span className="count">{cards.length}</span>
                    <button className="icon-button lane-add" type="button" disabled={saving || tasks === null} aria-label={`Añadir tarea a ${name}`} onClick={() => openEditor(status)}><Plus size={17} /></button>
                  </div>
                  <div className="lane-body">
                    {cards.map((task) => <TaskCard key={task.id} task={task} dragging={dragged === task.id}
                      onEdit={() => openEditor(task.status, task)}
                      onGrab={(event) => grab(event, task)} onMove={move} onRelease={release} onCancel={cancelDrag} />)}
                    {cards.length === 0 && (
                      <div className="empty">
                        <span className="empty-icon"><ClipboardList size={20} strokeWidth={1.6} /></span>
                        <span>{tasks === null ? (loadError ? "Tablero no disponible" : "Cargando…") : filtered ? "Sin coincidencias" : "Sin tareas"}</span>
                      </div>
                    )}
                    <button type="button" className="lane-create" disabled={saving || tasks === null} onClick={() => openEditor(status)}><Plus size={16} /> Añadir tarea</button>
                  </div>
                </section>
              );
            })}
          </div>
          <footer className="board-footer"><span><GripVertical size={16} /> Arrastra una tarjeta por su asa o cambia su estado al editarla.</span><span className="sync"><i /> {loadError ? "Sin conexión" : tasks === null ? "Conectando…" : "Tablero compartido"}</span></footer>
        </section>
        </>}

        <div className={notice ? "toast" : "sr-only"} role="status">{notice}{notice && <button type="button" className="icon-button" onClick={() => setNotice("")} aria-label="Cerrar aviso"><X size={16} /></button>}</div>
      </main>

      {editor && (
        <Modal title={editor.task ? "Editar tarea" : "Nueva tarea"} onClose={() => { if (!writing.current) setEditor(null); }}>
          <form onSubmit={submit} className="task-form">
            <label>Título<input autoFocus required maxLength={120} placeholder="¿Qué hay que hacer?" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
            <label>Descripción <span>(opcional)</span><textarea maxLength={2000} rows={3} placeholder="Detalles, materiales o enlaces" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <div className="form-row">
              <label>Responsable<input list="student-options" maxLength={80} placeholder="Nombre o equipo" value={form.assignee} onChange={(event) => setForm({ ...form, assignee: event.target.value })} /><datalist id="student-options">{students?.map((student) => <option key={student.section} value={student.name}>{student.displayName}</option>)}</datalist></label>
              <label>Fecha de entrega<input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></label>
            </div>
            <div className="form-row">
              <label>Prioridad<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as TaskFields["priority"] })}>
                {priorities.map((priority) => <option key={priority} value={priority}>{priorityNames[priority]}</option>)}
              </select></label>
              <label>Estado<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as TaskFields["status"] })}>
                {statuses.map((status) => <option key={status} value={status}>{columns[status].name}</option>)}
              </select></label>
            </div>
            {formError && <div role="alert" className="alert">{formError}</div>}
            {deleting && <p className="delete-prompt">¿Eliminar esta tarea del tablero de todo el grupo?</p>}
            <div className="modal-actions">
              {editor.task && !deleting && <button type="button" className="danger-quiet" disabled={saving} onClick={() => setDeleting(true)}><Trash2 size={16} /> Eliminar</button>}
              <span className="spacer" />
              {deleting && editor.task ? (
                <>
                  <button type="button" className="secondary" disabled={saving} onClick={() => setDeleting(false)}>Volver</button>
                  <button type="button" className="danger" disabled={saving} onClick={() => {
                    const task = editor.task!;
                    void mutate("DELETE", { id: task.id, revision: task.revision }, "Tarea eliminada.", true);
                  }}>{saving ? "Eliminando…" : "Confirmar eliminación"}</button>
                </>
              ) : (
                <>
                  <button type="button" className="secondary" disabled={saving} onClick={() => setEditor(null)}>Cancelar</button>
                  <button type="submit" className="primary" disabled={saving}>{saving ? "Guardando…" : editor.task ? "Guardar cambios" : "Crear tarea"} <ArrowRight size={17} /></button>
                </>
              )}
            </div>
          </form>
        </Modal>
      )}

      {studentForm && (
        <Modal title="Editar perfil" onClose={() => { if (!studentWriting.current) setStudentForm(null); }}>
          <form onSubmit={saveStudent} className="task-form">
            <label>Nombre visible<input required maxLength={80} value={studentForm.displayName} onChange={(event) => setStudentForm({ ...studentForm, displayName: event.target.value })} /></label>
            <label>Puesto de trabajo<input maxLength={500} value={studentForm.role} onChange={(event) => setStudentForm({ ...studentForm, role: event.target.value })} /></label>
            <label>Actividades cotidianas<textarea rows={3} maxLength={2000} value={studentForm.activities} onChange={(event) => setStudentForm({ ...studentForm, activities: event.target.value })} /></label>
            <label>Ayuda de la IA<textarea rows={3} maxLength={2000} value={studentForm.aiHelp} onChange={(event) => setStudentForm({ ...studentForm, aiHelp: event.target.value })} /></label>
            {studentFormError && <div role="alert" className="alert">{studentFormError}</div>}
            <div className="modal-actions"><span className="spacer" /><button type="button" className="secondary" disabled={studentSaving} onClick={() => setStudentForm(null)}>Cancelar</button><button type="submit" className="primary" disabled={studentSaving}>{studentSaving ? "Guardando…" : "Guardar cambios"}</button></div>
          </form>
        </Modal>
      )}

      {shareUrl && (
        <Modal title="Compartir tablero" onClose={() => setShareUrl("")}>
          <div className="share-content">
            <p>Da acceso a tu grupo desde las opciones de uso compartido de Sites y envíales este enlace. Todos veréis y editaréis las mismas tareas.</p>
            <label>Enlace del tablero<input aria-label="Enlace del tablero" readOnly value={shareUrl} onFocus={(event) => event.target.select()} /></label>
            <button type="button" className="primary" onClick={async () => {
              try {
                await navigator.clipboard.writeText(shareUrl);
                setCopied(true);
              } catch {
                const input = document.querySelector<HTMLInputElement>(".share-content input");
                input?.focus();
                input?.select();
              }
            }}>{copied ? <Check size={17} /> : <Link2 size={17} />}{copied ? "Enlace copiado" : "Copiar enlace"}</button>
          </div>
        </Modal>
      )}
    </>
  );
}
