"use client";

import { Plus } from "lucide-react";

/**
 * Sección «Tu Site» de los ajustes generales: explica cómo crear una copia
 * independiente de Aula Kanban y abre el diálogo de remix.
 * @param props - Acción que abre el diálogo de remix.
 * @returns La tarjeta contextual del remix.
 */
export default function SettingsSite({ onRemix }: { onRemix: () => void }) {
  return (
    <section className="settings-section" aria-labelledby="settings-site-title">
      <div>
        <h2 id="settings-site-title">Tu Site</h2>
        <p>Crea una copia independiente de Aula Kanban con su propia base de datos y personalízala para tu centro.</p>
      </div>
      <div className="settings-site-card">
        <div>
          <strong>Haz tu Site de Aula Kanban</strong>
          <p>La copia se publica en tu cuenta de ChatGPT y no comparte proyectos, tareas, fichas ni variables de esta instancia.</p>
        </div>
        <button type="button" className="primary" onClick={onRemix}>
          <Plus size={16} aria-hidden /> Haz tu Site de Aula Kanban
        </button>
      </div>
    </section>
  );
}
