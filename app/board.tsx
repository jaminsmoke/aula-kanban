"use client";

import {
  ArrowDown, ArrowRight, CalendarDays, Check, CircleCheck, CircleDashed, ClipboardList,
  Clock3, Columns3, Flag, GripVertical, Link2, ListFilter, Plus, ScanEye, Search, Trash2, X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DragEvent, FormEvent, ReactNode } from "react";
import { priorities, priorityNames, statuses } from "./task";
import type { Task, TaskFields } from "./task";

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

async function request<T>(method = "GET", body?: unknown): Promise<T> {
  const response = await fetch("/api/tasks", {
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

function TaskCard({ task, disabled, onEdit, onDrag, onDragEnd }: {
  task: Task; disabled: boolean; onEdit: () => void;
  onDrag: (event: DragEvent<HTMLButtonElement>) => void; onDragEnd: () => void;
}) {
  const initials = task.assignee.trim().split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0]).join("").toUpperCase();
  return (
    <button type="button" className="card" onClick={onEdit} draggable={!disabled} onDragStart={onDrag} onDragEnd={onDragEnd}>
      <span className="card-top">
        <span className={`priority ${task.priority}`}><Flag size={12} /> {priorityNames[task.priority]}</span>
        <GripVertical className="grip" size={17} aria-hidden />
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
  const [dragged, setDragged] = useState<Task | null>(null);
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

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 8000);
    window.addEventListener("focus", refresh);
    return () => {
      ++readVersion.current;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

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
    if (task) {
      void mutate("PATCH", { id: task.id, revision: task.revision, changes: form }, "Cambios guardados.", true);
    } else {
      void mutate("POST", form, "Tarea creada.", true);
    }
  }

  function drop(event: DragEvent, status: TaskFields["status"]) {
    event.preventDefault();
    setDestination(null);
    setDragged(null);
    if (dragged && dragged.status !== status) {
      void mutate("PATCH", { id: dragged.id, revision: dragged.revision, changes: { status } }, `Tarea movida a «${columns[status].name}».`, false);
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
          <button type="button" className="secondary share" onClick={() => {
            setCopied(false);
            setShareUrl(window.location.origin + "/");
          }}><Link2 size={17} /> Compartir</button>
        </div>
      </header>

      <main className="shell">
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
                <section key={status} className={`lane ${status}${destination === status ? " drop-target" : ""}`} aria-label={name}
                  onDragOver={(event) => {
                    if (!dragged || dragged.status === status) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setDestination(status);
                  }}
                  onDragLeave={(event) => {
                    if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
                      setDestination((current) => current === status ? null : current);
                    }
                  }}
                  onDrop={(event) => drop(event, status)}>
                  <div className="lane-header">
                    <span className="lane-icon"><Icon size={16} strokeWidth={2.25} /></span>
                    <h3>{name}</h3><span className="count">{cards.length}</span>
                    <button className="icon-button lane-add" type="button" disabled={saving || tasks === null} aria-label={`Añadir tarea a ${name}`} onClick={() => openEditor(status)}><Plus size={17} /></button>
                  </div>
                  <div className="lane-body">
                    {cards.map((task) => <TaskCard key={task.id} task={task} disabled={saving}
                      onEdit={() => openEditor(task.status, task)}
                      onDrag={(event) => {
                        setDragged(task);
                        event.dataTransfer.setData("text/plain", task.id);
                        event.dataTransfer.effectAllowed = "move";
                      }} onDragEnd={() => { setDragged(null); setDestination(null); }} />)}
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
          <footer className="board-footer"><span><GripVertical size={16} /> Arrastra una tarjeta o cambia su estado al editarla.</span><span className="sync"><i /> {loadError ? "Sin conexión" : tasks === null ? "Conectando…" : "Tablero compartido"}</span></footer>
        </section>

        <div className={notice ? "toast" : "sr-only"} role="status">{notice}{notice && <button type="button" className="icon-button" onClick={() => setNotice("")} aria-label="Cerrar aviso"><X size={16} /></button>}</div>
      </main>

      {editor && (
        <Modal title={editor.task ? "Editar tarea" : "Nueva tarea"} onClose={() => { if (!writing.current) setEditor(null); }}>
          <form onSubmit={submit} className="task-form">
            <label>Título<input autoFocus required maxLength={120} placeholder="¿Qué hay que hacer?" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
            <label>Descripción <span>(opcional)</span><textarea maxLength={2000} rows={3} placeholder="Detalles, materiales o enlaces" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <div className="form-row">
              <label>Responsable<input maxLength={80} placeholder="Nombre o equipo" value={form.assignee} onChange={(event) => setForm({ ...form, assignee: event.target.value })} /></label>
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
