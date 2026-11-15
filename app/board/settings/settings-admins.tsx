"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { accountLabel } from "../shared/model";
import type { Administrator } from "../shared/model";
import { request } from "../shared/api";

/**
 * Sección Administradores de los ajustes generales.
 * @param props - Permisos y recarga de proyectos.
 * @returns La gestión de fichas de administrador.
 */
export default function SettingsAdmins({ onProjectsChanged }: { onProjectsChanged: () => void }) {
  const [admins, setAdmins] = useState<Administrator[] | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<Administrator | null>(null);
  const [removing, setRemoving] = useState<Administrator | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setAdmins(await request<Administrator[]>("GET", undefined, "/api/administrators")); setError(""); }
    catch (caught) { setError((caught as Error).message); }
  }, []);

  useEffect(() => {
    let active = true;
    request<Administrator[]>("GET", undefined, "/api/administrators")
      .then((items) => { if (active) { setAdmins(items); setError(""); } })
      .catch((caught) => { if (active) setError((caught as Error).message); });
    return () => { active = false; };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      await request(editing ? "PATCH" : "POST", editing ? { id: editing.id, revision: editing.revision, displayName: name, email } : { displayName: name, email }, "/api/administrators");
      setEmail(""); setName(""); setEditing(null); await load(); onProjectsChanged();
    } catch (caught) { setError((caught as Error).message); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!removing || busy) return;
    setBusy(true); setError("");
    try {
      await request("DELETE", { id: removing.id, revision: removing.revision }, "/api/administrators");
      if (editing?.id === removing.id) { setEditing(null); setEmail(""); setName(""); }
      setRemoving(null); await load(); onProjectsChanged();
    } catch (caught) { setError((caught as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <section className="settings-section" aria-labelledby="settings-admins-title">
      <div>
        <h2 id="settings-admins-title">Administradores</h2>
        <p>Gestionan todos los proyectos y administradores. La propiedad del Site se gestiona por separado en Sites.</p>
      </div>
      <form onSubmit={save} className="admin-form">
        <label htmlFor="admin-name">Nombre de la ficha <span>(opcional)</span></label>
        <input id="admin-name" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre del administrador" />
        <label htmlFor="admin-email">Correo de ChatGPT <span>(opcional)</span>{editing && <small className={`account-status ${email !== editing.email ? "pending" : editing.accountStatus}`}>{email !== editing.email ? "Cambio sin guardar" : accountLabel(editing.accountStatus)}</small>}</label>
        <div><input id="admin-email" type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@ejemplo.com" /><button className="primary" type="submit" disabled={busy}>{editing ? "Guardar" : "Añadir ficha"}</button></div>
        <p>Sin correo, la ficha no concede acceso. Añadir o cambiar el correo crea una invitación al guardar; no se envía ningún email. Cambiarlo o eliminarlo retira el acceso anterior.</p>
        {editing && !editing.email && <p className="admin-note">Esta ficha no tiene correo: aparece en la lista, pero no da acceso a nadie hasta que añadas uno y la persona acepte la invitación.</p>}
        {editing && <button className="text-button" type="button" onClick={() => { setEditing(null); setEmail(""); setName(""); }}>Cancelar edición</button>}
      </form>
      {error && <p role="alert" className="admin-error">{error}</p>}
      {admins === null ? <p>Cargando administradores…</p> : admins.length === 0 ? <p>Aún no hay administradores adicionales.</p> : <ul className="admin-list">{admins.map((item) => <li key={item.id}>
        <div><strong>{item.displayName || item.email || "Administrador sin nombre"}</strong>{item.email ? <><small>{item.email}</small><small className={`account-status ${item.accountStatus}`}>{accountLabel(item.accountStatus)}</small></> : <small className="admin-no-email">Sin correo: no concede acceso</small>}</div>
        <button type="button" className="icon-button" aria-label={`Editar administrador ${item.displayName || item.email || "sin nombre"}`} title="Editar" onClick={() => { setEditing(item); setName(item.displayName); setEmail(item.email); setRemoving(null); setError(""); }}><Pencil size={16} /></button>
        <button type="button" className="icon-button admin-remove" aria-label={`Eliminar administrador ${item.displayName || item.email || "sin nombre"}`} title="Eliminar" onClick={() => { setRemoving(item); setError(""); }}><Trash2 size={16} /></button>
      </li>)}</ul>}
      {removing && <div className="admin-confirm" role="alert"><p>¿Eliminar la ficha de <strong>{removing.displayName || removing.email || "administrador sin nombre"}</strong>? {removing.email ? "Se retirará cualquier acceso de administrador asociado." : "No tiene correo, así que no concede acceso."}</p><div><button type="button" className="secondary" onClick={() => setRemoving(null)} disabled={busy}>Cancelar</button><button type="button" className="danger" onClick={() => void remove()} disabled={busy}>Eliminar ficha</button></div></div>}
    </section>
  );
}
