"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Check, Link2 } from "lucide-react";
import Modal from "../modal";
import type { Project } from "./model";

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

export function RemixDialog({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [prompt] = useState(() => `@Sites Crea un remix de Aula Kanban a partir de ${window.location.origin}. Quiero una copia propia, sin datos de usuarios, con su base de datos independiente. Ayúdame a configurar OWNER_EMAIL con mi cuenta de ChatGPT y a publicarla.`);
  return (
    <Modal title="Haz tu Site de Aula Kanban" onClose={onClose}><div className="share-content">
      <p>Crea tu propia copia independiente con Sites. La copia empieza sin proyectos, tareas, fichas ni administradores de este Site.</p>
      <p>Para solicitarla, copia el mensaje y pégalo en un chat de ChatGPT con Sites. Al configurarla, indica tu correo de ChatGPT como <strong>OWNER_EMAIL</strong> en las variables de entorno de tu nuevo Site y vuelve a publicarlo.</p>
      <p>La copia y su configuración se completan en Sites; este botón no puede crearla ni configurar el propietario automáticamente.</p>
      <label>Mensaje para Sites<textarea className="remix-prompt" readOnly value={prompt} onFocus={(event) => event.currentTarget.select()} /></label>
      <div className="remix-controls"><button type="button" className="secondary" onClick={async () => { try { await navigator.clipboard.writeText(prompt); setCopied(true); } catch { setCopied(false); } }}>{copied ? "Mensaje copiado" : "Copiar mensaje"}</button><a className="primary" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">Abrir ChatGPT</a></div>
    </div></Modal>
  );
}
