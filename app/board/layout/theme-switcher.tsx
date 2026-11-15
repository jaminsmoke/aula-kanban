"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "../shared/use-theme";
import type { ThemePreference } from "../../theme";

const options: { value: ThemePreference; label: string; icon: typeof Monitor }[] = [
  { value: "system", label: "Sistema", icon: Monitor },
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
];

/**
 * Selector de tema claro, oscuro o preferencia del sistema.
 * @returns El grupo de botones de tema.
 */
export default function ThemeSwitcher() {
  const { preference, setPreference } = useTheme();

  return (
    <div className="theme-switcher" role="group" aria-label="Tema de la interfaz">
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={preference === value}
          onClick={() => setPreference(value)}
        >
          <Icon size={16} aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}
