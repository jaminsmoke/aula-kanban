"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Check, Link2 } from "lucide-react";
import Modal from "../shared/modal";
import type { Project } from "../shared/model";
import "./project-dialogs.css";

/**
 * Diálogo para crear un proyecto nuevo.
 * @param props.project - Proyecto en edición.
 * @param props.name - Nombre de la ficha.
 * @param props.onName - Manejador de la acción «name».
 * @param props.error - Mensaje de error a mostrar.
 * @param props.saving - Si el formulario se está guardando.
 * @param props.onSubmit - Envía el formulario.
 * @param props.onClose - Cierra el diálogo.
 * @returns El formulario de creación de proyecto.
 */
export function NewProjectDialog({ project, onChange, error, saving, onSubmit, onClose }: {
  project: { id: string; name: string };
  onChange: (project: { id: string; name: string }) => void;
  error: string;
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  return (
    <Modal title="Nuevo proyecto" onClose={onClose}>
      <form className="task-form" onSubmit={onSubmit}>
        <label>Nombre del proyecto<input autoFocus required maxLength={80} value={project.name} onChange={(event) => onChange({ ...project, name: event.target.value })} placeholder="Nombre del proyecto" /></label>
        {error && <div role="alert" className="alert">{error}</div>}
        <div className="modal-actions"><span className="spacer" /><button type="button" className="secondary" disabled={saving} onClick={onClose}>Cancelar</button><button type="submit" className="primary" disabled={saving}>{saving ? "Creando…" : "Crear proyecto"}</button></div>
      </form>
    </Modal>
  );
}

/**
 * Diálogo de confirmación para eliminar un proyecto.
 * @param props.url - Enlace a compartir.
 * @param props.projectName - Nombre del proyecto compartido.
 * @param props.onClose - Cierra el diálogo.
 * @returns El formulario de confirmación de borrado.
 */
export function DeleteProjectDialog({ project, name, onName, error, saving, onSubmit, onClose }: {
  project: Project;
  name: string;
  onName: (name: string) => void;
  error: string;
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  return (
    <Modal title="Eliminar proyecto" onClose={onClose}>
      <form className="task-form" onSubmit={onSubmit}>
        <p className="delete-prompt">Se eliminarán el proyecto «{project.name}», sus tareas, fichas y permisos de acceso.</p>
        <label>Escribe el nombre del proyecto para confirmar<input required value={name} onChange={(event) => onName(event.target.value)} autoComplete="off" /></label>
        {error && <div role="alert" className="alert">{error}</div>}
        <div className="modal-actions"><span className="spacer" /><button type="button" className="secondary" disabled={saving} onClick={onClose}>Cancelar</button><button type="submit" className="danger" disabled={saving || name !== project.name}>{saving ? "Eliminando…" : "Eliminar proyecto"}</button></div>
      </form>
    </Modal>
  );
}

/**
 * Diálogo para compartir el enlace del proyecto.
 * @param props.onClose - Cierra el diálogo.
 * @returns El diálogo con el enlace y el botón de copiar.
 */
export function ShareDialog({ url, projectName, onClose }: { url: string; projectName: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <Modal title="Compartir proyecto" onClose={onClose}>
      <div className="share-content">
        <p>Comparte este enlace para abrir el proyecto «{projectName}». El acceso se gestiona desde Sites.</p>
        <label>Enlace del proyecto<input aria-label="Enlace del proyecto" readOnly value={url} onFocus={(event) => event.target.select()} /></label>
        <button type="button" className="primary" onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
          } catch {
            const input = document.querySelector<HTMLInputElement>(".share-content input");
            input?.focus();
            input?.select();
          }
        }}>{copied ? <Check size={17} /> : <Link2 size={17} />}{copied ? "Enlace copiado" : "Copiar enlace"}</button>
      </div>
    </Modal>
  );
}

/**
 * Diálogo con el mensaje para crear una copia propia en Sites.
 * @param props - Acción de cierre del diálogo.
 * @returns El diálogo con el mensaje listo para copiar.
 */
export function RemixDialog({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [gitCopied, setGitCopied] = useState(false);
  const [prompt] = useState(() => `@Sites Crea una copia nueva de Aula Kanban a partir de ${window.location.origin}. La copia será mía: el propietario es quien da esta orden, es decir, la cuenta de ChatGPT con la que publicas. Configura OWNER_EMAIL con el correo de esa misma cuenta antes de publicar. Quiero una copia vacía, con base de datos propia, sin proyectos, tareas, fichas, administradores ni variables de entorno de la instancia original. Al publicar, entra una vez con esa cuenta para guardar la identidad del propietario y ayúdame a verificar que puedo crear el primer proyecto. Alternativa clonar con git: pulsa «Copiar mensaje (git)» y pégalo a tu agente.`);
  const gitPrompt = "Crea una copia propia de Aula Kanban clonando el repositorio público (https://github.com/jaminsmoke/aula-kanban) con git: publica esa revisión como mi Site. La copia será mía: el propietario es quien da esta orden, es decir, la cuenta que ejecuta el sitio. Configura OWNER_EMAIL con el correo de esa misma cuenta antes de publicar. Quiero una copia vacía, con base de datos propia, sin proyectos, tareas, fichas, administradores ni variables de entorno de la instancia original. Al publicar, entra una vez con esa cuenta para guardar la identidad del propietario y ayúdame a verificar que puedo crear el primer proyecto.";
  return (
    <Modal title="Haz tu Site de Aula Kanban" onClose={onClose}><div className="share-content">
      <p>Crea tu propia copia independiente con Sites. La copia empieza sin proyectos, tareas, fichas ni administradores de este Site.</p>
      <p>También puedes clonar la fuente directamente desde el repo público: <code>git clone https://github.com/jaminsmoke/aula-kanban.git</code>. El resto (OWNER_EMAIL, copia vacía y primer acceso) es igual.</p>
      <p>El propietario de la copia es <strong>quien da la orden</strong>: tu cuenta de ChatGPT. El agente con el que hables publica el Site en esa cuenta y configura <strong>OWNER_EMAIL</strong> con el correo de la misma cuenta antes de publicar.</p>
      <p>La copia no hereda variables de entorno ni datos. El primer acceso con esa cuenta guarda la identidad del propietario; no hace falta que un tercero reclame la instancia.</p>
      <p>Comprueba que puedes crear un proyecto y gestionar administradores. Si no aparece el rol de propietario, revisa <strong>OWNER_EMAIL</strong> antes de compartir la copia.</p>
      <p>Este botón no crea el Site ni escribe variables de entorno: solo copia el mensaje y abre ChatGPT. La publicación se completa en Sites.</p>
      <label>Mensaje para Sites<textarea className="remix-prompt" readOnly value={prompt} onFocus={(event) => event.currentTarget.select()} /></label>
      <div className="remix-controls"><button type="button" className="secondary" onClick={async () => { try { await navigator.clipboard.writeText(prompt); setCopied(true); } catch { setCopied(false); } }}>{copied ? "Mensaje copiado" : "Copiar mensaje"}</button><button type="button" className="secondary" onClick={async () => { try { await navigator.clipboard.writeText(gitPrompt); setGitCopied(true); } catch { setGitCopied(false); } }}>{gitCopied ? "Mensaje (git) copiado" : "Copiar mensaje (git)"}</button><a className="primary" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">Abrir ChatGPT</a></div>
    </div></Modal>
  );
}
