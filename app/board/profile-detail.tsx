import { BriefcaseBusiness, Lightbulb, ListTodo, Pencil, Trash2 } from "lucide-react";
import type { Task } from "../task";
import { accountLabel, columns, formatDate, initials } from "./model";

export type ProfilePerson = {
  name: string;
  role: string;
  activities: string;
  aiHelp: string;
  accountStatus?: "pending" | "active" | "unlinked";
};

export default function ProfileDetail({ kicker, backLabel, person, canEdit, onBack, onEdit, onRemove, tasks, loading, onOpenTask }: {
  kicker: string;
  backLabel: string;
  person: ProfilePerson;
  canEdit: boolean;
  onBack: () => void;
  onEdit: () => void;
  onRemove: () => void;
  tasks: Task[];
  loading: boolean;
  onOpenTask: (task: Task) => void;
}) {
  return <div className="student-detail">
    <button className="text-button back-link" onClick={onBack}>← {backLabel}</button>
    <div className="student-profile-header">
      <span className="student-profile-avatar" aria-hidden>{initials(person.name)}</span>
      <div className="student-identity">
        <span className="student-kicker">{kicker}</span>
        <h2>{person.name}</h2>
        <p>{person.role || "Puesto sin especificar"}</p>
        <span className={`account-status ${person.accountStatus ?? "unlinked"}`}>{accountLabel(person.accountStatus)}</span>
      </div>
      {canEdit && <>
        <div className="profile-edit-wrap">
          <button type="button" className="profile-edit" aria-label="Editar perfil" aria-describedby="edit-profile-tooltip" onClick={onEdit}><Pencil size={18} aria-hidden /></button>
          <span className="profile-tooltip" id="edit-profile-tooltip" role="tooltip">Editar perfil</span>
        </div>
        <div className="profile-edit-wrap">
          <button type="button" className="profile-delete" aria-label="Eliminar perfil" aria-describedby="delete-profile-tooltip" onClick={onRemove}><Trash2 size={18} aria-hidden /></button>
          <span className="profile-tooltip" id="delete-profile-tooltip" role="tooltip">Eliminar perfil</span>
        </div>
      </>}
    </div>
    <div className="student-info">
      <div className="student-info-card"><span className="info-icon role"><BriefcaseBusiness size={18} aria-hidden /></span><div><h3>Puesto de trabajo</h3><p>{person.role || "Sin especificar"}</p></div></div>
      <div className="student-info-card"><span className="info-icon activities"><ListTodo size={18} aria-hidden /></span><div><h3>Actividades cotidianas</h3><p>{person.activities || "Sin especificar"}</p></div></div>
      <div className="student-info-card"><span className="info-icon ai"><Lightbulb size={18} aria-hidden /></span><div><h3>Ayuda de la IA</h3><p>{person.aiHelp || "Sin especificar"}</p></div></div>
    </div>
    <h3 className="student-tasks-title">Sus tareas <span>({tasks.length})</span></h3>
    {loading ? <p>Cargando tareas…</p> : tasks.length ? tasks.map((task) => <button className="student-task" key={task.id} onClick={() => onOpenTask(task)}>
      <span><strong>{task.title}</strong>{task.dueDate && <small>Entrega {formatDate.format(new Date(task.dueDate + "T12:00:00"))}</small>}</span>
      <span className={"student-status " + task.status}>{columns[task.status].name}</span>
    </button>) : <p className="intro">Todavía no tiene tareas asignadas.</p>}
  </div>;
}
