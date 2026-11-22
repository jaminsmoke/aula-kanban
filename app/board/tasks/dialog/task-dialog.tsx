"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, Trash2 } from "lucide-react";
import type { Task, TaskFields } from "../../../../lib/domain/task";
import type { Student } from "../../../../lib/domain/student";
import Modal from "../../shared/modal";
import { crearMiniaturaDeArchivo } from "../../shared/image-thumbnail";
import AssigneeFields from "./assignee-fields";
import TaskDetail from "./task-detail";
import TaskForm from "./task-form";
import TaskWhiteboard from "./task-whiteboard";
import type { TaskDocumentOption } from "../use-task-documents";
import "./task-dialog.css";

/**
 * Diálogo para crear, editar o ver una tarea en solo lectura.
 * @param props - Editor, formulario, responsables, permisos y acciones.
 * @returns El diálogo de tarea o su detalle de solo lectura.
 */
export default function TaskDialog({
  editor, form, onForm, formError, saving, deleting, onDeleting, canManage, canEditTask, ownStudent,
  students, teachers, claiming, onAddAssignee, onRemoveAssignee, onAssignee, onAssignClass, onRemoveClass, onSubmit, onClose, onDelete,
  documents = [], documentsLoading = false, documentsError = "", onOpenDocument,
}: {
  editor: { task?: Task; status: TaskFields["status"] };
  form: TaskFields;
  onForm: (form: TaskFields) => void;
  formError: string;
  saving: boolean;
  deleting: boolean;
  onDeleting: (deleting: boolean) => void;
  canManage: boolean;
  canEditTask: (task: Task) => boolean;
  ownStudent?: Student;
  students: Student[] | null;
  teachers: { id: string; name: string; displayName: string }[] | null;
  claiming: boolean;
  onAddAssignee: () => void;
  onRemoveAssignee: (index: number) => void;
  onAssignee: (index: number, value: string) => void;
  onAssignClass: () => void;
  onRemoveClass: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  onDelete: (task: Task) => void;
  documents?: TaskDocumentOption[];
  documentsLoading?: boolean;
  documentsError?: string;
  onOpenDocument?: (documentId: string) => void;
}) {
  const readOnly = Boolean(editor.task && !canEditTask(editor.task));
  const [tab, setTab] = useState<"resumen" | "asignaciones" | "pizarra">("resumen");
  // En la pestaña Pizarra el diálogo se ensancha para que el lienzo y sus
  // menús quepan; al ampliar, la pizarra se muestra como popup fijo sobre
  // el diálogo (sin hacerlo crecer) y la misma instancia sigue montada.
  const boardTab = !readOnly && Boolean(editor.task) && tab === "pizarra";
  const [imageError, setImageError] = useState("");
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setImageError("");
    try {
      const projectId = new URLSearchParams(window.location.search).get("project") || "default";
      // El derivado sustituye al original solo si se genera y pesa menos; los
      // GIF y los navegadores sin canvas siguen subiendo el archivo tal cual.
      const miniatura = await crearMiniaturaDeArchivo(file);
      const derivado = miniatura && miniatura.blob.size > 0 && miniatura.blob.size < file.size
        ? new File([miniatura.blob], `${file.name.replace(/\.[^.]*$/, "") || "imagen"}.webp`, { type: miniatura.blob.type || "image/webp" })
        : file;
      const body = new FormData();
      body.append("file", derivado);
      body.append("purpose", "task-image");
      const response = await fetch(`/api/uploads?project=${encodeURIComponent(projectId)}`, { method: "POST", body });
      const data = await response.json().catch(() => null) as { url?: unknown; message?: unknown } | null;
      if (!response.ok || typeof data?.url !== "string") throw new Error(data && typeof data.message === "string" ? data.message : "No se pudo subir la imagen.");
      onForm({ ...form, imageUrl: data.url });
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!form.title.trim()) {
      setTab("resumen");
      onSubmit(event);
      return;
    }
    if (form.imageUrl && (!/^https?:\/\/\S+$/i.test(form.imageUrl.trim()) && !/^\/api\/files\/[A-Za-z0-9-]+$/.test(form.imageUrl.trim()) || form.imageUrl.trim().length > 2048)) {
      event.preventDefault();
      setTab("resumen");
      setImageError("Introduce una URL de imagen válida que empiece por http:// o https:// (o sube una imagen).");
      return;
    }
    setImageError("");
    onSubmit(event);
  }

  return (
    <Modal title={readOnly ? "Detalle de la tarea" : editor.task ? "Editar tarea" : "Nueva tarea"} onClose={onClose} closable={!saving} className={boardTab ? "task-dialog-board" : undefined}>
      {readOnly && editor.task ? <TaskDetail task={editor.task} documents={documents} onOpenDocument={onOpenDocument} /> : <form onSubmit={handleSubmit} noValidate className={claiming ? "task-form claiming" : "task-form"}>
        {claiming && <p className="claim-banner">Asígnate esta tarea y guarda para poder editar sus detalles.</p>}
        {editor.task && <p className="intro">Creada por: {editor.task.creator || "No registrado"}</p>}
        <div className="task-tabs" role="tablist" aria-label="Secciones de la tarea">
          <button type="button" role="tab" id="tab-resumen" aria-selected={tab === "resumen"} aria-controls="panel-resumen" className={tab === "resumen" ? "task-tab active" : "task-tab"} onClick={() => setTab("resumen")}>Resumen</button>
          <button type="button" role="tab" id="tab-asignaciones" aria-selected={tab === "asignaciones"} aria-controls="panel-asignaciones" className={tab === "asignaciones" ? "task-tab active" : "task-tab"} onClick={() => setTab("asignaciones")}>Asignaciones{form.assignees.length > 0 ? ` (${form.assignees.length})` : ""}</button>
          {editor.task && <button type="button" role="tab" id="tab-pizarra" aria-selected={tab === "pizarra"} aria-controls="panel-pizarra" className={tab === "pizarra" ? "task-tab active" : "task-tab"} onClick={() => setTab("pizarra")}>Pizarra</button>}
        </div>
        <div role="tabpanel" id="panel-resumen" aria-labelledby="tab-resumen" hidden={tab !== "resumen"}>
          <TaskForm
            form={form}
            onForm={onForm}
            formError={formError}
            claiming={claiming}
            imageError={imageError}
            onImageError={setImageError}
            uploading={uploading}
            onUpload={(file) => void handleUpload(file)}
            documents={documents}
            documentsLoading={documentsLoading}
            documentsError={documentsError}
          />
        </div>
        <div role="tabpanel" id="panel-asignaciones" aria-labelledby="tab-asignaciones" hidden={tab !== "asignaciones"}>
          <AssigneeFields
            form={form}
            onForm={onForm}
            canManage={canManage}
            students={students}
            teachers={teachers}
            ownStudent={ownStudent}
            claiming={claiming}
            onAddAssignee={onAddAssignee}
            onRemoveAssignee={onRemoveAssignee}
            onAssignee={onAssignee}
            onAssignClass={onAssignClass}
            onRemoveClass={onRemoveClass}
          />
        </div>
        {editor.task && <TaskWhiteboard taskId={editor.task.id} readOnly={readOnly || claiming} active={tab === "pizarra"} />}
        {!canManage && !ownStudent && <p className="intro">El profesorado debe vincular tu cuenta a una ficha para que puedas asignarte tareas.</p>}
        {formError && <div role="alert" className="alert">{formError}</div>}
        {deleting && editor.task && <div className="delete-confirm" role="group" aria-label="Confirmar eliminación">
          <p className="delete-prompt"><strong>¿Eliminar “{editor.task.title}”?</strong> Se eliminará del tablero de todo el grupo y no hay papelera.</p>
        </div>}
        <div className="modal-actions">
          {editor.task && !deleting && !claiming && <button type="button" className="danger-quiet" disabled={saving} onClick={() => onDeleting(true)}><Trash2 size={16} /> Eliminar</button>}
          <span className="spacer" />
          {deleting && editor.task ? (
            <>
              <button type="button" className="secondary" disabled={saving} onClick={() => onDeleting(false)}>Volver</button>
              <button type="button" className="danger" disabled={saving} onClick={() => onDelete(editor.task!)}>{saving ? "Eliminando…" : "Confirmar eliminación"}</button>
            </>
          ) : (
            <>
              <button type="button" className="secondary" disabled={saving} onClick={onClose}>Cancelar</button>
              <button type="submit" className="primary" disabled={saving}>{saving ? "Guardando…" : claiming ? "Asignarme y guardar" : editor.task ? "Guardar cambios" : "Crear tarea"} <ArrowRight size={16} /></button>
            </>
          )}
        </div>
      </form>}
    </Modal>
  );
}
