import { BriefcaseBusiness, Lightbulb, ListTodo, Pencil, Trash2 } from "lucide-react";
import type { Task } from "../../../lib/domain/task";
import { accountLabel, columns, formatDate, initials } from "../shared/model";
import { profileInfoItems, sortProfileTasks } from "./profile-detail-utils";

export type ProfilePerson = {
  name: string;
  role: string;
  activities: string;
  aiHelp: string;
  accountStatus?: "pending" | "active" | "unlinked";
};

/**
 * Detalle de una ficha con sus datos, estado de la cuenta y tareas.
 * @param props - Persona, permisos, tareas y acciones de navegación y edición.
 * @returns La vista de detalle de la ficha.
 */
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
  const info = profileInfoItems(person);
  const orderedTasks = sortProfileTasks(tasks);
  const InfoIcon = { role: BriefcaseBusiness, activities: ListTodo, ai: Lightbulb } as const;
  return <div className="student-detail">
    <button className="text-button back-link" onClick={onBack}>← {backLabel}</button>
    <div className="student-profile-header">
      <span className="student-profile-avatar" aria-hidden>{initials(person.name)}</span>
      <div className="student-identity">
        <span className="student-kicker">{kicker}</span>
        <h2>{person.name}</h2>
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
    {(person.accountStatus ?? "unlinked") === "unlinked" && <p className="no-email-note">Sin correo, la ficha no da acceso a esta cuenta. Añade un correo en Editar para activarla.</p>}
    <h3 className="student-tasks-title">Sus tareas <span>({tasks.length})</span></h3>
    {loading ? <p>Cargando tareas…</p> : orderedTasks.length ? orderedTasks.map((task) => <button className="student-task" key={task.id} onClick={() => onOpenTask(task)}>
      <span><strong>{task.title}</strong>{task.dueDate && <small>Entrega {formatDate.format(new Date(task.dueDate + "T12:00:00"))}</small>}</span>
      <span className={"student-status " + task.status}>{columns[task.status].name}</span>
    </button>) : <p className="intro">Todavía no tiene tareas asignadas.</p>}
    {info.length > 0 && <div className="student-info">
      {info.map((item) => {
        const Icon = InfoIcon[item.key];
        return <div className="student-info-card" key={item.key}>
          <span className={`info-icon ${item.key}`}><Icon size={18} aria-hidden /></span>
          <div><h3>{item.label}</h3><p>{item.value}</p></div>
        </div>;
      })}
    </div>}
  </div>;
}
