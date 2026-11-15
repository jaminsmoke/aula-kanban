"use client";

import ThemeSwitcher from "./theme-switcher";

/**
 * Sección Apariencia de los ajustes generales.
 * @returns El selector de tema y su explicación.
 */
export default function SettingsAppearance() {
  return (
    <section className="settings-section" aria-labelledby="settings-appearance-title">
      <div>
        <h2 id="settings-appearance-title">Apariencia</h2>
        <p>Elige cómo quieres ver Aula Kanban en este navegador.</p>
      </div>
      <div className="appearance-control">
        <span className="appearance-label">Tema de la interfaz</span>
        <ThemeSwitcher />
        <p className="settings-note">La opción Sistema sigue la preferencia del dispositivo. La elección se guarda solo en este navegador.</p>
      </div>
    </section>
  );
}
