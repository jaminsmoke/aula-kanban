"use client";

import {
  ArrowDown, ArrowRight, CalendarDays, Check, CircleCheck, CircleDashed, ClipboardList,
  BriefcaseBusiness, ChevronDown, Clock3, Columns3, Flag, FolderKanban, GripVertical, LayoutGrid, Lightbulb, Link2, List, ListFilter, ListTodo, LogOut, Pencil, Plus, ScanEye, Search, Settings, Trash2, Users, X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, PointerEvent, ReactNode } from "react";
import { priorities, priorityNames, statuses } from "./task";
import type { Task, TaskFields } from "./task";
import type { Student } from "./student";
import { taskBelongsTo } from "./assignments";
import TeachersView from "./teachers-view";

const columns = {
  pending: { name: "Por hacer", icon: CircleDashed },
  active: { name: "En curso", icon: Clock3 },
  review: { name: "En revisión", icon: ScanEye },
  done: { name: "Hecho", icon: CircleCheck },
};
const blank: TaskFields = {
  title: "", description: "", assignee: "", assignees: [], dueDate: "", priority: "normal", status: "pending",
};
const formatDate = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" });
type Project = { id: string; name: string; createdAt: number; role: "owner" | "admin" | "teacher" | "student" | "guest"; studentSection: string | null; teacherId: string | null };
type Member = { id: string; email: string; role: "teacher" | "student" | "guest"; studentSection: string | null; teacherId: string | null; status: "pending" | "active" };
type Invitation = { id: string; projectId: string; projectName: string; role: "teacher" | "student" | "guest" };
const accountLabel = (status?: string) => status === "active" ? "Cuenta activa" : status === "pending" ? "Invitación pendiente" : "Sin usuario asociado";
type Administrator = { id: string; email: string; createdAt: number; active: boolean };

class RequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function request<T>(method = "GET", body?: unknown, path = "/api/tasks"): Promise<T> {
  const projectId = new URLSearchParams(window.location.search).get("project") || "default";
  const url = path === "/api/projects" ? path : `${path}?project=${encodeURIComponent(projectId)}`;
  const response = await fetch(url, {
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

function TaskCard({ task, dragging, editable, onEdit, onGrab, onMove, onRelease, onCancel }: {
  task: Task;
  dragging: boolean;
  editable: boolean;
  onEdit: () => void;
  onGrab: (event: GripEvent) => void;
  onMove: (event: GripEvent) => void;
  onRelease: (event: GripEvent) => void;
  onCancel: () => void;
}) {
  const initials = task.assignee.trim().split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0]).join("").toUpperCase();
  return (
    <button type="button" className={dragging ? "card dragging" : "card"} onClick={onEdit} title={editable ? "Abrir tarea" : "Ver tarea (solo lectura)"}>
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
      {!task.assignees.length && task.assignee.trim() && task.assignee.trim().toLocaleLowerCase("es") !== "por definir" && <span className="legacy-assignee">Responsable sin vincular</span>}
      {(task.assignee || task.dueDate) && (
        <span className="card-meta">
          {task.assignee && <span className="assignee" title={task.assignee}><span className="avatar">{initials}</span><span>{task.assignee}</span></span>}
          {task.dueDate && <span className="date"><CalendarDays size={14} /> <time dateTime={task.dueDate}>{formatDate.format(new Date(task.dueDate + "T12:00:00"))}</time></span>}
        </span>
      )}
    </button>
  );
}

export default function Board({ user }: { user: { displayName: string; email: string } }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [owner, setOwner] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"general" | "admins">("general");
  const [remixOpen, setRemixOpen] = useState(false);
  const [remixCopied, setRemixCopied] = useState(false);
  const [remixPrompt, setRemixPrompt] = useState("");
  const [admins, setAdmins] = useState<Administrator[] | null>(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [editingAdmin, setEditingAdmin] = useState<Administrator | null>(null);
  const [removingAdmin, setRemovingAdmin] = useState<Administrator | null>(null);
  const [adminError, setAdminError] = useState("");
  const [adminBusy, setAdminBusy] = useState(false);
  const [projectId, setProjectId] = useState("default");
  const [projectError, setProjectError] = useState("");
  const [newProject, setNewProject] = useState<{ id: string; name: string } | null>(null);
  const [projectSaving, setProjectSaving] = useState(false);
  const projectWriting = useRef(false);
  const [projectDeleting, setProjectDeleting] = useState(false);
  const [deleteProjectName, setDeleteProjectName] = useState("");
  const [membersOpen, setMembersOpen] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [invitationError, setInvitationError] = useState("");
  const [invitationBusy, setInvitationBusy] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberForm, setMemberForm] = useState({ email: "", role: "student" as "student" | "teacher" | "guest", studentSection: "", teacherId: "" });
  const [memberError, setMemberError] = useState("");
  const [memberBusy, setMemberBusy] = useState(false);
  const [removeMember, setRemoveMember] = useState<Member | null>(null);
  const [view, setView] = useState<"kanban" | "alumnos" | "profesores">("kanban");
  const [studentName, setStudentName] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[] | null>(null);
  const [teachers, setTeachers] = useState<{ id: string; name: string }[] | null>(null);
  const [studentError, setStudentError] = useState("");
  const [studentForm, setStudentForm] = useState<Student | null>(null);
  const [studentFormError, setStudentFormError] = useState("");
  const [studentSaving, setStudentSaving] = useState(false);
  const [studentDeleting, setStudentDeleting] = useState<Student | null>(null);
  const [studentLayout, setStudentLayout] = useState<"grid" | "list">("grid");
  const studentWriting = useRef(false);
  const studentReadVersion = useRef(0);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [studentFilter, setStudentFilter] = useState("");
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

  const refreshProjects = useCallback(async () => {
    try {
      const next = await request<{ projects: Project[]; isOwner: boolean; isAdmin?: boolean }>("GET", undefined, "/api/projects");
      const explicit = new URLSearchParams(window.location.search).get("project");
      const currentId = explicit || "default";
      if (!explicit && next.projects.length && !next.projects.some((item) => item.id === currentId)) {
        window.location.replace("/?project=" + encodeURIComponent(next.projects[0].id));
        return;
      }
      setProjects(next.projects);
      setOwner(next.isOwner);
      setAdmin(Boolean(next.isAdmin));
      setProjectsLoaded(true);
      setProjectId(currentId);
      setProjectError(next.projects.some((item) => item.id === currentId) || (!next.projects.length && !explicit) ? "" : "No tienes acceso a este proyecto o ya no existe.");
    } catch (error) {
      setProjectsLoaded(true);
      setProjectError((error as Error).message);
    }
  }, []);

  const refreshInvitations = useCallback(async () => {
    try { setInvitations(await request<Invitation[]>("GET", undefined, "/api/invitations")); setInvitationError(""); }
    catch (error) { setInvitationError((error as Error).message); }
  }, []);
  async function acceptInvitation(id: string) {
    if (invitationBusy) return; setInvitationBusy(true); setInvitationError("");
    try { const result = await request<{ projectId: string }>("POST", { id }, "/api/invitations"); window.location.assign("/?project=" + encodeURIComponent(result.projectId)); }
    catch (error) { setInvitationError((error as Error).message); setInvitationBusy(false); }
  }

  async function loadAdmins() {
    try { setAdmins(await request<Administrator[]>("GET", undefined, "/api/administrators")); setAdminError(""); }
    catch (error) { setAdminError((error as Error).message); }
  }
  async function saveAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (adminBusy) return;
    setAdminBusy(true); setAdminError("");
    try {
      await request(editingAdmin ? "PATCH" : "POST", editingAdmin ? { id: editingAdmin.id, email: adminEmail } : { email: adminEmail }, "/api/administrators");
      setAdminEmail(""); setEditingAdmin(null); await loadAdmins();
    } catch (error) { setAdminError((error as Error).message); }
    finally { setAdminBusy(false); }
  }
  async function deleteAdmin() {
    if (!removingAdmin || adminBusy) return;
    setAdminBusy(true); setAdminError("");
    try {
      await request("DELETE", { id: removingAdmin.id }, "/api/administrators");
      if (editingAdmin?.id === removingAdmin.id) { setEditingAdmin(null); setAdminEmail(""); }
      setRemovingAdmin(null); await loadAdmins();
    } catch (error) { setAdminError((error as Error).message); }
    finally { setAdminBusy(false); }
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newProject || projectWriting.current) return;
    projectWriting.current = true;
    setProjectSaving(true);
    setProjectError("");
    try {
      const created = await request<Project>("POST", newProject, "/api/projects");
      window.location.assign("/?project=" + encodeURIComponent(created.id));
    } catch (error) {
      setProjectError((error as Error).message);
      projectWriting.current = false;
      setProjectSaving(false);
    }
  }

  async function deleteProject() {
    const selected = projects.find((project) => project.id === projectId);
    if (!selected || deleteProjectName !== selected.name || projectWriting.current) return;
    projectWriting.current = true;
    setProjectSaving(true);
    setProjectError("");
    try {
      try {
        await request("DELETE", { id: projectId }, "/api/projects");
      } catch (error) {
        if (error instanceof RequestError && error.status < 500) throw error;
        await request("DELETE", { id: projectId }, "/api/projects");
      }
      window.location.assign("/");
    } catch (error) {
      setProjectError((error as Error).message);
      projectWriting.current = false;
      setProjectSaving(false);
    }
  }

  async function loadMembers() {
    setMemberError("");
    try { setMembers(await request<Member[]>("GET", undefined, "/api/members")); }
    catch (error) { setMemberError((error as Error).message); }
  }

  async function saveMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (memberBusy) return;
    setMemberBusy(true);
    setMemberError("");
    try {
      await request("POST", { ...memberForm, studentSection: memberForm.studentSection || null, teacherId: memberForm.teacherId || null }, "/api/members");
      setMemberForm({ email: "", role: "student", studentSection: "", teacherId: "" });
      await loadMembers();
      void refreshStudents(); void refreshTeachers();
    } catch (error) { setMemberError((error as Error).message); }
    finally { setMemberBusy(false); }
  }

  async function deleteMember() {
    if (!removeMember || memberBusy) return;
    setMemberBusy(true);
    setMemberError("");
    try {
      await request("DELETE", { id: removeMember.id }, "/api/members");
      setRemoveMember(null);
      await loadMembers();
      void refreshStudents(); void refreshTeachers();
    } catch (error) { setMemberError((error as Error).message); }
    finally { setMemberBusy(false); }
  }

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

  const refreshTeachers = useCallback(async () => {
    try { setTeachers(await request<{ id: string; name: string }[]>("GET", undefined, "/api/teachers")); }
    catch { setTeachers(null); }
  }, []);

  async function saveStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!studentForm || studentWriting.current) return;
    studentWriting.current = true;
    ++studentReadVersion.current;
    setStudentSaving(true);
    setStudentFormError("");
    try {
      const isNew = studentForm.revision === 0;
      const updated = await request<Student>(isNew ? "POST" : "PATCH", studentForm, "/api/students");
      if (!isNew) {
        const previous = students?.find(item => item.section === studentForm.section);
        const nextEmail = (studentForm.accountEmail ?? "").trim().toLowerCase();
        const priorEmail = (previous?.accountEmail ?? "").trim().toLowerCase();
        if (nextEmail !== priorEmail) {
          try {
            if (nextEmail) await request("POST", { email: nextEmail, role: "student", studentSection: studentForm.section }, "/api/members");
            else if (previous?.accountMemberId) await request("DELETE", { id: previous.accountMemberId }, "/api/members");
          } catch (error) { setStudentForm({ ...studentForm, revision: updated.revision }); throw error; }
        }
      }
      setStudents((previous) => isNew ? [...(previous ?? []), updated] : previous?.map((student) => student.section === updated.section ? updated : student) ?? [updated]);
      if (isNew) setStudentName(updated.section);
      setStudentForm(null);
      setNotice(isNew ? "Alumno añadido." : "Perfil actualizado.");
    } catch (error) {
      setStudentFormError((error as Error).message);
    } finally {
      studentWriting.current = false;
      setStudentSaving(false);
      void refreshStudents();
    }
  }

  async function deleteStudent() {
    if (!studentDeleting || studentWriting.current) return;
    studentWriting.current = true;
    ++studentReadVersion.current;
    setStudentSaving(true);
    setStudentFormError("");
    try {
      await request<Student>("DELETE", { section: studentDeleting.section, revision: studentDeleting.revision }, "/api/students");
      setStudents((previous) => previous?.filter((student) => student.section !== studentDeleting.section) ?? []);
      setStudentFilter((current) => current === studentDeleting.section ? "" : current);
      setStudentName(null);
      setStudentDeleting(null);
      setNotice("Perfil eliminado.");
    } catch (error) {
      setStudentFormError((error as Error).message);
    } finally {
      studentWriting.current = false;
      setStudentSaving(false);
      void refreshStudents();
    }
  }

  useEffect(() => {
    void refreshProjects();
    void refreshInvitations();
    void refresh();
    void refreshStudents();
    void refreshTeachers();
    const timer = window.setInterval(() => { if (!document.hidden) { void refresh(); void refreshStudents(); void refreshTeachers(); } }, 8000);
    window.addEventListener("focus", refresh);
    window.addEventListener("focus", refreshStudents);
    window.addEventListener("focus", refreshTeachers);
    window.addEventListener("focus", refreshProjects);
    window.addEventListener("focus", refreshInvitations);
    return () => {
      ++readVersion.current;
      ++studentReadVersion.current;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("focus", refreshStudents);
      window.removeEventListener("focus", refreshTeachers);
      window.removeEventListener("focus", refreshProjects);
      window.removeEventListener("focus", refreshInvitations);
    };
  }, [refresh, refreshStudents, refreshProjects, refreshTeachers, refreshInvitations]);

  function openEditor(status: TaskFields["status"], task?: Task) {
    if (writing.current) return;
    if (!activeProject || (!task && isGuest)) return;
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
    const fields = form;
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
    if (!canManage && !ownsTask(task)) return;
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
  const activeProject = projects.find((item) => item.id === projectId);
  const canManage = activeProject?.role === "owner" || activeProject?.role === "admin" || activeProject?.role === "teacher";
  const isGuest = activeProject?.role === "guest";
  const ownStudent = students?.find((student) => student.section === activeProject?.studentSection);
  const allPeople: Student[] = [...(students ?? []).map(student => ({ ...student, displayName: student.name })), ...(teachers ?? []).map((teacher) => ({ section: teacher.id, name: teacher.name, displayName: teacher.name, role: "", activities: "", aiHelp: "", revision: 1 }))];
  const matchingStudent = (student: Student) => ({ ...student, displayName: student.name });
  const ownsTask = (task: Task) => Boolean(ownStudent && task.assignees?.length === 1 && task.assignees.some(person => person.kind === "student" && person.profileId === ownStudent.section));
  const unassigned = (name: string) => !name.trim() || name.trim().toLocaleLowerCase("es") === "por definir";
  const canEditTask = (task: Task) => Boolean(!isGuest && (canManage || (ownStudent && (task.assignees.length === 0 && unassigned(task.assignee) || ownsTask(task)))));
  const claiming = Boolean(editor?.task && !canManage && !editor.task.assignees.length && unassigned(editor.task.assignee));
  const total = all.length;
  const finished = all.filter((task) => task.status === "done").length;
  const progress = total ? Math.round(finished / total * 100) : 0;
  const query = search.trim().toLocaleLowerCase("es");
  const selectedStudent = students?.find((student) => student.section === studentFilter);
  const visible = all.filter((task) => {
    const haystack = [task.title, task.description, task.assignee].join(" ").toLocaleLowerCase("es");
    return (!filter || task.priority === filter) && haystack.includes(query)
      && (!studentFilter || Boolean(selectedStudent && teachers !== null && taskBelongsTo(task, matchingStudent(selectedStudent), allPeople)));
  });
  const filtered = Boolean(query || filter || studentFilter);

  return (
    <>
      <header className="topbar">
        <div className="shell topbar-inner">
          <span className="wordmark"><span className="brand-icon"><Columns3 size={20} strokeWidth={2.6} /></span>Aula Kanban</span>
          <nav className="main-nav" aria-label="Vistas">
            <button type="button" aria-current={view === "kanban" ? "page" : undefined} onClick={() => setView("kanban")}>Kanban</button>
            <button type="button" aria-current={view === "alumnos" ? "page" : undefined} onClick={() => { setView("alumnos"); setStudentName(null); }}>Alumnos</button>
            <button type="button" aria-current={view === "profesores" ? "page" : undefined} onClick={() => setView("profesores")}>Profesores</button>
          </nav>
          <details className="project-menu">
            <summary aria-label="Seleccionar proyecto"><FolderKanban size={18} /><span>{projects.find((project) => project.id === projectId)?.name ?? (projectError ? "Proyecto no disponible" : "Cargando proyecto…")}</span><ChevronDown size={16} /></summary>
            <div className="project-dropdown">
              <p>Proyectos</p>
              {projects.map((project) => <a key={project.id} href={project.id === "default" ? "/" : `/?project=${encodeURIComponent(project.id)}`} aria-current={project.id === projectId ? "page" : undefined}><span>{project.name}</span>{project.id === projectId && <Check size={16} />}</a>)}
              <div className="project-menu-actions">
                {(owner || admin) && <button type="button" onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); setProjectError(""); setNewProject({ id: crypto.randomUUID(), name: "" }); }}><Plus size={16} /> Nuevo proyecto</button>}
                {activeProject && <button type="button" onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); setCopied(false); const url = new URL("/", window.location.origin); url.searchParams.set("project", projectId); setShareUrl(url.href); }}><Link2 size={16} /> Compartir proyecto</button>}
                {canManage && <button type="button" onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); setMembersOpen(true); setRemoveMember(null); void loadMembers(); }}><Users size={16} /> Gestionar miembros</button>}
                {(owner || admin) && activeProject && <button type="button" className="project-delete-action" onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); setDeleteProjectName(""); setProjectError(""); setProjectDeleting(true); }}><Trash2 size={16} /> Eliminar proyecto</button>}
                <button type="button" className="remix-action" onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); setRemixCopied(false); setRemixPrompt(`@Sites Crea un remix de Aula Kanban a partir de ${window.location.origin}. Quiero una copia propia, sin datos de usuarios, con su base de datos independiente. Ayúdame a configurar OWNER_EMAIL con mi cuenta de ChatGPT y a publicarla.`); setRemixOpen(true); }}><Plus size={16} /> Haz tu Site de Aula Kanban</button>
              </div>
            </div>
          </details>
          <details className="account-menu">
            <summary className="account-indicator" aria-label="Ver cuenta de ChatGPT">
              <span className="account-avatar" aria-hidden>{(user.displayName.trim()[0] || user.email[0]).toUpperCase()}</span>
              <span className="account-name">{user.displayName}</span>
            </summary>
            <div className="account-dropdown">
              <strong>Cuenta de ChatGPT</strong><span>{user.email}</span>
              <button type="button" onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); setSettingsTab("general"); setSettingsOpen(true); if (owner || admin) void loadAdmins(); }}><Settings size={16} /> Ajustes de la cuenta</button>
              <a href="/signout-with-chatgpt?return_to=%2Fsesion" target="_top"><LogOut size={16} /> Cerrar sesión</a>
            </div>
          </details>
        </div>
      </header>

      {settingsOpen && <Modal title="Cuenta y permisos" onClose={() => setSettingsOpen(false)}>
        <div className="account-settings">
          {(owner || admin) && <div className="settings-tabs" role="tablist" aria-label="Secciones de ajustes"><button role="tab" aria-selected={settingsTab === "general"} onClick={() => setSettingsTab("general")}>General</button><button role="tab" aria-selected={settingsTab === "admins"} onClick={() => setSettingsTab("admins")}>Administradores</button></div>}
          {settingsTab === "general" && <>
          <p>Tu cuenta en esta instancia de Aula Kanban.</p>
          <dl>
            <div><dt>Cuenta de ChatGPT</dt><dd>{user.displayName}<br /><span>{user.email}</span></dd></div>
            <div><dt>Permiso en la aplicación</dt><dd>{!projectsLoaded ? "Consultando…" : owner ? "Propietario y administrador" : admin ? "Administrador" : "Sin permisos de administración"}</dd></div>
            <div><dt>Proyecto activo</dt><dd>{activeProject?.name ?? "Ninguno"}</dd></div>
            <div><dt>Rol en el proyecto</dt><dd>{!projectsLoaded ? "Consultando…" : activeProject ? ({ owner: "Propietario", admin: "Administrador", teacher: "Profesor", student: "Alumno", guest: "Invitado" } as const)[activeProject.role] : "Sin acceso a un proyecto activo"}</dd></div>
          </dl>
          <p className="account-settings-note">Los permisos de esta aplicación son independientes de la propiedad del Site en Sites.</p>
          <a className="secondary account-signout" href="/signout-with-chatgpt?return_to=%2Fsesion" target="_top"><LogOut size={16} /> Cerrar sesión</a>
          </>}
          {(owner || admin) && settingsTab === "admins" && <section className="admin-management" aria-labelledby="admins-heading">
            <div><h3 id="admins-heading">Administradores</h3><p>Gestionan todos los proyectos y administradores. La propiedad del Site se gestiona por separado en Sites.</p></div>
            <form onSubmit={saveAdmin} className="admin-form">
              <label htmlFor="admin-email">{editingAdmin ? "Editar correo" : "Correo de la cuenta de ChatGPT"}</label>
              <div><input id="admin-email" type="email" required maxLength={254} value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} placeholder="nombre@ejemplo.com" /><button className="primary" type="submit" disabled={adminBusy}>{editingAdmin ? "Guardar" : "Añadir"}</button></div>
              {editingAdmin && <><p>Al cambiar el correo se revoca el acceso anterior y la nueva cuenta tendrá que iniciar sesión.</p><button className="text-button" type="button" onClick={() => { setEditingAdmin(null); setAdminEmail(""); }}>Cancelar edición</button></>}
            </form>
            {adminError && <p role="alert" className="admin-error">{adminError}</p>}
            {admins === null ? <p>Cargando administradores…</p> : admins.length === 0 ? <p>Aún no hay administradores adicionales.</p> : <ul className="admin-list">{admins.map((item) => <li key={item.id}>
              <div><strong>{item.email}</strong><small>{item.active ? "Cuenta vinculada" : "Pendiente de primer acceso"}</small></div>
              <button type="button" className="icon-button" aria-label={`Editar administrador ${item.email}`} title="Editar" onClick={() => { setEditingAdmin(item); setAdminEmail(item.email); setRemovingAdmin(null); setAdminError(""); }}><Pencil size={17} /></button>
              <button type="button" className="icon-button admin-remove" aria-label={`Eliminar administrador ${item.email}`} title="Eliminar" onClick={() => { setRemovingAdmin(item); setAdminError(""); }}><Trash2 size={17} /></button>
            </li>)}</ul>}
            {removingAdmin && <div className="admin-confirm" role="alert"><p>¿Eliminar a <strong>{removingAdmin.email}</strong> como administrador? Perderá este acceso de inmediato.</p><div><button type="button" className="secondary" onClick={() => setRemovingAdmin(null)} disabled={adminBusy}>Cancelar</button><button type="button" className="danger" onClick={() => void deleteAdmin()} disabled={adminBusy}>Eliminar acceso</button></div></div>}
          </section>}
        </div>
      </Modal>}

      {remixOpen && <Modal title="Haz tu Site de Aula Kanban" onClose={() => setRemixOpen(false)}><div className="share-content">
        <p>Crea tu propia copia independiente con Sites. La copia empieza sin proyectos, tareas, fichas ni administradores de este Site.</p>
        <p>Para solicitarla, copia el mensaje y pégalo en un chat de ChatGPT con Sites. Al configurarla, indica tu correo de ChatGPT como <strong>OWNER_EMAIL</strong> en las variables de entorno de tu nuevo Site y vuelve a publicarlo.</p>
        <p>La copia y su configuración se completan en Sites; este botón no puede crearla ni configurar el propietario automáticamente.</p>
        <label>Mensaje para Sites<textarea className="remix-prompt" readOnly value={remixPrompt} onFocus={(event) => event.currentTarget.select()} /></label>
        <div className="remix-controls"><button type="button" className="secondary" onClick={async () => { try { await navigator.clipboard.writeText(remixPrompt); setRemixCopied(true); } catch { setRemixCopied(false); } }}>{remixCopied ? "Mensaje copiado" : "Copiar mensaje"}</button><a className="primary" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">Abrir ChatGPT</a></div>
      </div></Modal>}

      <main className="shell">
        {invitations.length > 0 && <section className="invitation-panel" aria-label="Invitaciones pendientes"><h2>Invitaciones pendientes</h2>{invitations.map(invitation => <div className="invitation-row" key={invitation.id}><span><strong>{invitation.projectName}</strong> · {({ teacher: "Profesor", student: "Alumno", guest: "Invitado" } as const)[invitation.role]}</span><button className="primary" disabled={invitationBusy} onClick={() => void acceptInvitation(invitation.id)}>Aceptar invitación</button></div>)}</section>}
        {invitationError && <div className="alert" role="alert">{invitationError}</div>}
        {projectError && !newProject && !projectDeleting && <div role="alert" className="alert project-alert">{projectError} <button type="button" className="text-button" onClick={() => void refreshProjects()}>Reintentar</button></div>}
        {projectsLoaded && !activeProject ? <section className="students-view"><h1>Proyectos</h1><p className="intro">{owner || admin ? "Crea un proyecto para empezar." : "Todavía no tienes acceso a ningún proyecto. Pide al profesorado que invite tu cuenta."}</p>{(owner || admin) && <button className="primary" type="button" onClick={() => { setProjectError(""); setNewProject({ id: crypto.randomUUID(), name: "" }); }}><Plus size={18} /> Nuevo proyecto</button>}</section> : !activeProject ? null : view === "profesores" ? <TeachersView key={projectId} projectId={projectId} isAdmin={owner || admin} ownTeacherId={activeProject.teacherId} tasks={tasks} students={students} openTask={(task) => openEditor(task.status, task)} /> : view === "alumnos" ? (
          <section className="students-view">
            <p className="eyebrow"><span /> Grupo de clase</p>
            <div className="students-heading">
              <div className="students-title-row">
                <h1>Alumnos</h1>
                {canManage && <button type="button" className="primary add-student" aria-label="Añadir alumno" title="Añadir alumno" onClick={() => { setStudentForm({ section: crypto.randomUUID(), name: "", displayName: "", role: "", activities: "", aiHelp: "", revision: 0, accountEmail: "" }); setStudentFormError(""); }}><Plus size={20} aria-hidden /></button>}
              </div>
              <p className="intro">Fichas del grupo y tareas asignadas.</p>
            </div>
            {loadError && <div role="alert" className="alert">{loadError} <button type="button" className="text-button" onClick={() => void refresh()}>Reintentar</button></div>}
            {studentError && <div role="alert" className="alert">{studentError} <button type="button" className="text-button" onClick={() => void refreshStudents()}>Reintentar</button></div>}
            {studentName ? (() => {
              const student = students?.find((item) => item.section === studentName);
              if (!student) return <div className="student-detail"><p>Esta ficha ya no está disponible.</p><button className="text-button back-link" onClick={() => setStudentName(null)}>← Todos los alumnos</button></div>;
              const assigned = teachers === null ? [] : all.filter((task) => taskBelongsTo(task, matchingStudent(student), allPeople));
              return <div className="student-detail">
                <button className="text-button back-link" onClick={() => setStudentName(null)}>← Todos los alumnos</button>
                <div className="student-profile-header">
                  <span className="student-profile-avatar" aria-hidden>{student.displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
                  <div className="student-identity"><span className="student-kicker">Ficha de alumno</span><h2>{student.displayName}</h2><p>{student.role || "Puesto sin especificar"}</p><span className={`account-status ${student.accountStatus ?? "unlinked"}`}>{accountLabel(student.accountStatus)}</span></div>
                  {(canManage || ownStudent?.section === student.section) && <><div className="profile-edit-wrap">
                    <button type="button" className="profile-edit" aria-label="Editar perfil" aria-describedby="edit-profile-tooltip" onClick={() => { setStudentForm(student); setStudentFormError(""); }}><Pencil size={18} aria-hidden /></button>
                    <span className="profile-tooltip" id="edit-profile-tooltip" role="tooltip">Editar perfil</span>
                  </div>
                  <div className="profile-edit-wrap">
                    <button type="button" className="profile-delete" aria-label="Eliminar perfil" aria-describedby="delete-profile-tooltip" onClick={() => { setStudentDeleting(student); setStudentFormError(""); }}><Trash2 size={18} aria-hidden /></button>
                    <span className="profile-tooltip" id="delete-profile-tooltip" role="tooltip">Eliminar perfil</span>
                  </div></>}
                </div>
                <div className="student-info">
                  <div className="student-info-card"><span className="info-icon role"><BriefcaseBusiness size={18} aria-hidden /></span><div><h3>Puesto de trabajo</h3><p>{student.role || "Sin especificar"}</p></div></div>
                  <div className="student-info-card"><span className="info-icon activities"><ListTodo size={18} aria-hidden /></span><div><h3>Actividades cotidianas</h3><p>{student.activities || "Sin especificar"}</p></div></div>
                  <div className="student-info-card"><span className="info-icon ai"><Lightbulb size={18} aria-hidden /></span><div><h3>Ayuda de la IA</h3><p>{student.aiHelp || "Sin especificar"}</p></div></div>
                </div>
                <h3 className="student-tasks-title">Sus tareas <span>({assigned.length})</span></h3>
                {tasks === null ? <p>Cargando tareas…</p> : assigned.length ? assigned.map((task) => <button className="student-task" key={task.id} onClick={() => openEditor(task.status, task)}>
                  <span><strong>{task.title}</strong>{task.dueDate && <small>Entrega {formatDate.format(new Date(task.dueDate + "T12:00:00"))}</small>}</span>
                  <span className={"student-status " + task.status}>{columns[task.status].name}</span>
                </button>) : <p className="intro">Todavía no tiene tareas asignadas.</p>}
              </div>;
            })() : <><div className="students-view-options" aria-label="Vista de alumnos">
              <span>{students?.length ?? 0} alumnos</span>
              <div className="layout-toggle" role="group" aria-label="Seleccionar vista">
                <button type="button" aria-label="Vista mosaico" aria-pressed={studentLayout === "grid"} onClick={() => setStudentLayout("grid")}><LayoutGrid size={18} /></button>
                <button type="button" aria-label="Vista lista" aria-pressed={studentLayout === "list"} onClick={() => setStudentLayout("list")}><List size={18} /></button>
              </div>
            </div><div className={studentLayout === "grid" ? "students-grid" : "students-grid students-list"}>
              {students === null && <p>{studentError ? "No se pudieron cargar las fichas." : "Cargando fichas…"}</p>}
              {students?.map((student) => <button type="button" className="student-card" key={student.section} onClick={() => setStudentName(student.section)}>
                <span className="student-avatar">{student.displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
                <span><strong>{student.displayName}</strong><small>{student.role}</small><small className={`account-status ${student.accountStatus ?? "unlinked"}`}>{accountLabel(student.accountStatus)}</small></span>
                <ArrowRight size={17} />
              </button>)}
            </div></>}
          </section>
        ) : <>
        <section className="hero" aria-labelledby="board-title">
          <div className="hero-content">
            <p className="eyebrow"><span /> Grupo de clase</p>
            <h1 id="board-title">Tablero de tareas</h1>
            <p className="intro">Organizad el trabajo y seguid el avance de cada tarea.</p>
            {!isGuest && <button className="primary" type="button" disabled={saving || tasks === null} onClick={() => openEditor("pending")}><Plus size={19} /> Nueva tarea</button>}
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
              <label className="filter"><Users size={17} /><select value={studentFilter} aria-label="Filtrar por alumno" onChange={(event) => setStudentFilter(event.target.value)}>
                <option value="">Todos los alumnos</option>
                {students?.map((student) => <option key={student.section} value={student.section}>{student.displayName}</option>)}
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
                    {!isGuest && <button className="icon-button lane-add" type="button" disabled={saving || tasks === null} aria-label={`Añadir tarea a ${name}`} onClick={() => openEditor(status)}><Plus size={17} /></button>}
                  </div>
                  <div className="lane-body">
                    {cards.map((task) => <TaskCard key={task.id} task={task} dragging={dragged === task.id} editable={canEditTask(task)}
                      onEdit={() => openEditor(task.status, task)}
                      onGrab={(event) => grab(event, task)} onMove={move} onRelease={release} onCancel={cancelDrag} />)}
                    {cards.length === 0 && (
                      <div className="empty">
                        <span className="empty-icon"><ClipboardList size={20} strokeWidth={1.6} /></span>
                        <span>{tasks === null ? (loadError ? "Tablero no disponible" : "Cargando…") : filtered ? "Sin coincidencias" : "Sin tareas"}</span>
                      </div>
                    )}
                    {!isGuest && <button type="button" className="lane-create" disabled={saving || tasks === null} onClick={() => openEditor(status)}><Plus size={16} /> Añadir tarea</button>}
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
        <Modal title={editor.task && !canEditTask(editor.task) ? "Detalle de la tarea" : editor.task ? "Editar tarea" : "Nueva tarea"} onClose={() => { if (!writing.current) setEditor(null); }}>
          {editor.task && !canEditTask(editor.task) ? <div className="share-content"><h3>{editor.task.title}</h3><p>{editor.task.description || "Sin descripción"}</p><p>Responsable: {editor.task.assignee || "Sin asignar"} · Estado: {columns[editor.task.status].name}</p><p>Prioridad: {priorityNames[editor.task.priority]}{editor.task.dueDate ? ` · Fecha: ${editor.task.dueDate}` : ""}</p><p>Creada por: {editor.task.creator || "No registrado"}</p></div> : <form onSubmit={submit} className="task-form">
            {editor.task && <p className="intro">Creada por: {editor.task.creator || "No registrado"}</p>}
            <label>Título<input autoFocus required disabled={claiming} maxLength={120} placeholder="¿Qué hay que hacer?" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
            <label>Descripción <span>(opcional)</span><textarea disabled={claiming} maxLength={2000} rows={3} placeholder="Detalles, materiales o enlaces" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <div className="form-row">
              <label>Responsable{canManage ? <><select value={form.assignees[0] ? `${form.assignees[0].kind}:${form.assignees[0].profileId}` : ""} onChange={(event) => { const value = event.target.value; if (!value) { setForm({ ...form, assignees: [] }); return; } const split = value.indexOf(":"); const kind = value.slice(0, split) as "student" | "teacher", id = value.slice(split + 1); const name = kind === "student" ? students?.find(item => item.section === id)?.displayName : teachers?.find(item => item.id === id)?.name; if (name) setForm({ ...form, assignee: name, assignees: [{ kind, profileId: id, name }] }); }}><option value="">Sin ficha vinculada</option><optgroup label="Alumnos">{students?.map(student => <option key={student.section} value={`student:${student.section}`}>{student.displayName}</option>)}</optgroup><optgroup label="Profesores">{teachers?.map(teacher => <option key={teacher.id} value={`teacher:${teacher.id}`}>{teacher.name}</option>)}</optgroup></select>{!form.assignees.length && <input maxLength={80} placeholder="Sin asignar o responsable en texto" value={form.assignee} onChange={(event) => setForm({ ...form, assignee: event.target.value })} />}</> : <select value={ownStudent && form.assignees.some(person => person.kind === "student" && person.profileId === ownStudent.section) ? ownStudent.section : ""} onChange={(event) => { const assigned = Boolean(event.target.value && ownStudent); setForm({ ...form, assignee: assigned ? ownStudent!.name : "", assignees: assigned ? [{ kind: "student", profileId: ownStudent!.section, name: ownStudent!.displayName }] : [] }); }}>
                <option value="">Sin asignar</option>{ownStudent && <option value={ownStudent.section}>{ownStudent.displayName} (tú)</option>}
              </select>}</label>
              <label>Fecha de entrega<input disabled={claiming} type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></label>
            </div>
            <div className="form-row">
              <label>Prioridad<select disabled={claiming} value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as TaskFields["priority"] })}>
                {priorities.map((priority) => <option key={priority} value={priority}>{priorityNames[priority]}</option>)}
              </select></label>
              <label>Estado<select disabled={claiming} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as TaskFields["status"] })}>
                {statuses.map((status) => <option key={status} value={status}>{columns[status].name}</option>)}
              </select></label>
            </div>
            {claiming && <p className="intro">Asígnate esta tarea y guarda para poder editar sus detalles.</p>}
            {!canManage && !ownStudent && <p className="intro">El profesorado debe vincular tu cuenta a una ficha para que puedas asignarte tareas.</p>}
            {formError && <div role="alert" className="alert">{formError}</div>}
            {deleting && <p className="delete-prompt">¿Eliminar esta tarea del tablero de todo el grupo?</p>}
            <div className="modal-actions">
              {editor.task && !deleting && !claiming && <button type="button" className="danger-quiet" disabled={saving} onClick={() => setDeleting(true)}><Trash2 size={16} /> Eliminar</button>}
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
          </form>}
        </Modal>
      )}

      {studentForm && (
        <Modal title={studentForm.revision ? "Editar perfil" : "Añadir alumno"} onClose={() => { if (!studentWriting.current) setStudentForm(null); }}>
          <form onSubmit={saveStudent} className="task-form">
            <label>Nombre visible<input required maxLength={80} value={studentForm.displayName} onChange={(event) => setStudentForm({ ...studentForm, displayName: event.target.value })} /></label>
            <label>Correo de ChatGPT<input type="email" required={!studentForm.revision} maxLength={254} value={studentForm.accountEmail ?? ""} onChange={(event) => setStudentForm({ ...studentForm, accountEmail: event.target.value })} /></label>
            <p className="intro">La cuenta recibirá una invitación pendiente dentro de Aula Kanban. Si cambias o eliminas el correo, se retirará el acceso anterior.</p>
            <label>Puesto de trabajo<input maxLength={500} value={studentForm.role} onChange={(event) => setStudentForm({ ...studentForm, role: event.target.value })} /></label>
            <label>Actividades cotidianas<textarea rows={3} maxLength={2000} value={studentForm.activities} onChange={(event) => setStudentForm({ ...studentForm, activities: event.target.value })} /></label>
            <label>Ayuda de la IA<textarea rows={3} maxLength={2000} value={studentForm.aiHelp} onChange={(event) => setStudentForm({ ...studentForm, aiHelp: event.target.value })} /></label>
            {studentFormError && <div role="alert" className="alert">{studentFormError}</div>}
            <div className="modal-actions"><span className="spacer" /><button type="button" className="secondary" disabled={studentSaving} onClick={() => setStudentForm(null)}>Cancelar</button><button type="submit" className="primary" disabled={studentSaving}>{studentSaving ? "Guardando…" : studentForm.revision ? "Guardar cambios" : "Añadir alumno"}</button></div>
          </form>
        </Modal>
      )}

      {studentDeleting && (
        <Modal title="Eliminar perfil" onClose={() => { if (!studentWriting.current) setStudentDeleting(null); }}>
          <div className="share-content">
            <p>¿Quieres eliminar la ficha de {studentDeleting.displayName}? Las tareas se conservarán en el tablero con el nombre de su responsable.</p>
            {studentFormError && <div role="alert" className="alert">{studentFormError}</div>}
            <div className="modal-actions"><span className="spacer" /><button type="button" className="secondary" disabled={studentSaving} onClick={() => setStudentDeleting(null)}>Cancelar</button><button type="button" className="danger" disabled={studentSaving} onClick={() => void deleteStudent()}>{studentSaving ? "Eliminando…" : "Confirmar eliminación"}</button></div>
          </div>
        </Modal>
      )}

      {newProject && (
        <Modal title="Nuevo proyecto" onClose={() => { if (!projectWriting.current) setNewProject(null); }}>
          <form className="task-form" onSubmit={createProject}>
            <label>Nombre del proyecto<input autoFocus required maxLength={80} value={newProject.name} onChange={(event) => setNewProject({ ...newProject, name: event.target.value })} placeholder="Nombre del proyecto" /></label>
            {projectError && <div role="alert" className="alert">{projectError}</div>}
            <div className="modal-actions"><span className="spacer" /><button type="button" className="secondary" disabled={projectSaving} onClick={() => setNewProject(null)}>Cancelar</button><button type="submit" className="primary" disabled={projectSaving}>{projectSaving ? "Creando…" : "Crear proyecto"}</button></div>
          </form>
        </Modal>
      )}

      {projectDeleting && activeProject && (
        <Modal title="Eliminar proyecto" onClose={() => { if (!projectWriting.current) setProjectDeleting(false); }}>
          <form className="task-form" onSubmit={(event) => { event.preventDefault(); void deleteProject(); }}>
            <p className="delete-prompt">Se eliminarán el proyecto «{activeProject.name}», sus tareas, fichas y permisos de acceso.</p>
            <label>Escribe el nombre del proyecto para confirmar<input required value={deleteProjectName} onChange={(event) => setDeleteProjectName(event.target.value)} autoComplete="off" /></label>
            {projectError && <div role="alert" className="alert">{projectError}</div>}
            <div className="modal-actions"><span className="spacer" /><button type="button" className="secondary" disabled={projectSaving} onClick={() => setProjectDeleting(false)}>Cancelar</button><button type="submit" className="danger" disabled={projectSaving || deleteProjectName !== activeProject.name}>{projectSaving ? "Eliminando…" : "Eliminar proyecto"}</button></div>
          </form>
        </Modal>
      )}

      {membersOpen && (
        <Modal title="Gestionar miembros" onClose={() => { if (!memberBusy) setMembersOpen(false); }}>
          <div className="member-content">
            <p>Invita una cuenta de ChatGPT. La persona debe iniciar sesión con ese correo y aceptar antes de acceder.</p>
            <form onSubmit={saveMember} className="task-form member-form">
              <label>Correo de la cuenta<input required type="email" maxLength={254} value={memberForm.email} onChange={(event) => setMemberForm({ ...memberForm, email: event.target.value })} /></label>
              <div className="form-row">
                <label>Rol<select value={memberForm.role} onChange={(event) => setMemberForm({ ...memberForm, role: event.target.value as "teacher" | "student" | "guest", studentSection: "", teacherId: "" })}><option value="student">Alumno</option>{(owner || admin) && <><option value="teacher">Profesor</option><option value="guest">Invitado · solo lectura</option></>}</select></label>
                {memberForm.role === "student" && <label>Ficha de alumno<select required value={memberForm.studentSection} onChange={(event) => setMemberForm({ ...memberForm, studentSection: event.target.value })}><option value="">Seleccionar ficha</option>{students?.map((student) => <option key={student.section} value={student.section}>{student.displayName}</option>)}</select></label>}
                {memberForm.role === "teacher" && <label>Ficha de profesor<select required value={memberForm.teacherId} onChange={(event) => setMemberForm({ ...memberForm, teacherId: event.target.value })}><option value="">Seleccionar ficha</option>{teachers?.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label>}
              </div>
              <button className="primary" type="submit" disabled={memberBusy}>{memberBusy ? "Guardando…" : "Crear invitación"}</button>
            </form>
            {memberError && <div role="alert" className="alert">{memberError}</div>}
            <h3>Invitaciones y miembros</h3>
            {members.length ? members.map((member) => <div className="member-row" key={member.id}>
              <div><strong>{member.email}</strong><small>{member.role === "teacher" ? "Profesor" : member.role === "student" ? "Alumno" : "Invitado"} · {member.status === "active" ? "Activo" : "Pendiente"}{member.studentSection ? ` · ${students?.find((student) => student.section === member.studentSection)?.displayName ?? "Ficha no disponible"}` : member.teacherId ? ` · ${teachers?.find((teacher) => teacher.id === member.teacherId)?.name ?? "Ficha no disponible"}` : ""}</small></div>
              {(owner || admin || member.role === "student") && <><button type="button" className="text-button" disabled={memberBusy} onClick={() => { setMemberForm({ email: member.email, role: member.role, studentSection: member.studentSection ?? "", teacherId: member.teacherId ?? "" }); setRemoveMember(null); }}>Editar</button><button type="button" className="danger-quiet" disabled={memberBusy} onClick={() => setRemoveMember(member)}>Quitar</button></>}
            </div>) : <p>Sin miembros añadidos.</p>}
            {removeMember && <div className="member-confirm"><p>¿Quitar el acceso de {removeMember.email} a este proyecto?</p><button type="button" className="secondary" disabled={memberBusy} onClick={() => setRemoveMember(null)}>Cancelar</button><button type="button" className="danger" disabled={memberBusy} onClick={() => void deleteMember()}>Quitar acceso</button></div>}
          </div>
        </Modal>
      )}

      {shareUrl && (
        <Modal title="Compartir proyecto" onClose={() => setShareUrl("")}>
          <div className="share-content">
            <p>Comparte este enlace para abrir el proyecto «{projects.find((project) => project.id === projectId)?.name}». El acceso se gestiona desde Sites.</p>
            <label>Enlace del proyecto<input aria-label="Enlace del proyecto" readOnly value={shareUrl} onFocus={(event) => event.target.select()} /></label>
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
