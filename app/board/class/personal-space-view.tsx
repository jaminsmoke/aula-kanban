"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { AnimatePresence, LazyMotion, MotionConfig, domAnimation } from "motion/react";
import { BookOpen, Folder, Settings2 } from "lucide-react";
import StoreWindow from "../store/store-window";
import { storeTools, toolApps } from "../apps/registry";
import { visibleTools, type StoreRole, type StoreTool } from "../store/tools";
import { useDesktopWindows } from "../store/use-desktop-windows";
import BooksFolder, { bookTool } from "./books-folder";
import BookViewer from "./book-viewer";
import "../store/store-desktop.css";
import "../store/catalog/store.css";
import "./personal-space.css";

type PersonalAppRow = {
  id: string;
  name: string;
  tagline: string;
  category: string;
  favorite: boolean;
  position: number | null;
  folder: string | null;
};

type PersonalFolder = { name: string; tools: StoreTool[] };
type DesktopEntry = { kind: "app"; tool: StoreTool } | { kind: "folder"; folder: PersonalFolder };

const ORGANIZER_ID = "personal-organizer";

const organizerTool: StoreTool = {
  id: ORGANIZER_ID,
  name: "Organizar herramientas",
  tagline: "Agrupa tus apps en carpetas propias",
  description: "Escribe el nombre de una carpeta para cada herramienta.",
  categories: ["Educación"],
  subcategory: "Herramientas",
  cover: "",
  features: [],
  appVersion: "1.0.0",
  versionLabel: "Organizar",
  upstream: { name: "Aula Kanban", version: "" },    window: { width: 560, height: 480 },
    icon: Settings2,
  roles: ["owner", "admin", "teacher", "student", "guest"],
};

/**
 * Convierte el nombre escrito en una carpeta válida para la API.
 * @param value - Texto del campo de carpeta.
 * @returns El nombre normalizado o `null` para dejarla suelta.
 */
function folderName(value: string): string | null {
  return value.trim().replace(/\s+/g, " ") || null;
}

/**
 * Agrupa las apps en el orden personal: cada carpeta ocupa la posición
 * de su primera app y conserva el orden de sus miembros.
 * @param apps - Apps visibles con su preferencia de carpeta.
 * @returns Apps sueltas y carpetas en orden de presentación.
 */
function groupDesktopApps(apps: { app: PersonalAppRow; tool: StoreTool }[]): DesktopEntry[] {
  const folders = new Map<string, PersonalFolder>();
  const entries: DesktopEntry[] = [];
  for (const { app, tool } of apps) {
    const name = app.folder?.trim();
    if (!name) {
      entries.push({ kind: "app", tool });
      continue;
    }
    const existing = folders.get(name);
    if (existing) {
      existing.tools.push(tool);
      continue;
    }
    const folder = { name, tools: [tool] };
    folders.set(name, folder);
    entries.push({ kind: "folder", folder });
  }
  return entries;
}

/**
 * Adapta una carpeta a la forma de herramienta que abre una ventana.
 * @param name - Nombre normalizado de la carpeta.
 * @returns La herramienta simulada de la carpeta.
 */
function folderTool(name: string): StoreTool {
  return {
    id: `folder:${name}`,
    name,
    tagline: `Carpeta ${name}`,
    description: `Aplicaciones guardadas en la carpeta ${name}.`,
    categories: ["Educación"],
    subcategory: "Herramientas",
    cover: "",
    features: [],
    appVersion: "1.0.0",
    versionLabel: name,
    upstream: { name: "Aula Kanban", version: "" },
    window: { width: 520, height: 320 },
    icon: Folder,
    roles: ["owner", "admin", "teacher", "student", "guest"],
  };
}

/**
 * Escritorio personal de la mochila del alumnado y del maletín docente
 * (APP-03): el mismo desktop que Tienda, pero sin tienda — solo los
 * iconos de las apps instaladas, en el orden personal del usuario
 * (favoritas primero, según `/api/personal-apps`), y ventanas que se
 * abren, arrastran, minimizan y amplían igual que en Tienda. El dock
 * solo conserva las ventanas minimizadas: no hay catálogo ni
 * instalación aquí; eso sigue en Aula Store.
 *
 * APP-03B añade carpetas personales: se agrupan por nombre en el orden
 * personal, se abren como ventana con sus apps y se organizan desde un
 * formulario que guarda en la misma API. La carpeta «Libros» sigue
 * siendo independiente.
 * @param props - Rol en el proyecto activo y proyecto.
 * @returns El escritorio personal dentro de Clase.
 */
export default function PersonalSpaceView({ role, projectId }: {
  role: StoreRole;
  projectId: string;
}) {
  const [apps, setApps] = useState<PersonalAppRow[]>([]);
  const [bookIds, setBookIds] = useState<string[]>([]);
  const [openBookIds, setOpenBookIds] = useState<string[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const title = role === "teacher" ? "Maletín docente" : "Mi mochila";
  const { desktopRef, desktopSize, windows, open, focus, close, minimize, restore, move, resize, zoom } = useDesktopWindows();

  const refresh = useCallback(async () => {
    try {
      const [personal, assignment] = await Promise.all([
        fetch(`/api/personal-apps?project=${encodeURIComponent(projectId)}`, { cache: "no-store" }),
        fetch(`/api/project-books?project=${encodeURIComponent(projectId)}`, { cache: "no-store" }),
      ]);
      if (!personal.ok) throw new Error();
      const data = (await personal.json()) as { apps: PersonalAppRow[] };
      setApps(data.apps);
      if (assignment.ok) {
        const books = (await assignment.json()) as { books: { id: string; enabled: boolean }[] };
        setBookIds(books.books.filter((book) => book.enabled).map((book) => book.id));
      } else {
        setBookIds([]);
      }
      setConfigured(true);
      setError("");
    } catch {
      setConfigured(false);
      setError("No se pudieron consultar tus herramientas.");
    }
  }, [projectId]);

  useEffect(() => {
    const first = window.setTimeout(() => { void refresh(); }, 0);
    const timer = window.setInterval(() => { void refresh(); }, 10000);
    return () => { window.clearTimeout(first); window.clearInterval(timer); };
  }, [refresh]);

  // Solo las herramientas visibles para el rol, en el orden personal que
  // devuelve el servidor (favoritas primero).
  const visibleIds = new Set(visibleTools(role).map((tool) => tool.id));
  const desktopApps = apps
    .filter((app) => visibleIds.has(app.id))
    .map((app) => ({ app, tool: storeTools.find((tool) => tool.id === app.id) }))
    .filter((item): item is { app: PersonalAppRow; tool: StoreTool } => Boolean(item.tool));
  const desktopTools = desktopApps.map((item) => item.tool);
  const desktopIds = new Set(desktopTools.map((tool) => tool.id));
  const entries = groupDesktopApps(desktopApps);
  const folders = entries
    .filter((entry): entry is { kind: "folder"; folder: PersonalFolder } => entry.kind === "folder")
    .map((entry) => entry.folder);
  const folderNames = new Set(folders.map((folder) => folder.name));
  // La carpeta «Libros» es una herramienta más del escritorio (STORE-04):
  // icono propio cuando el proyecto tiene libros habilitados, y las
  // ventanas de sus libros solo mientras sigan habilitados.
  const booksTool: StoreTool = {
    id: "books",
    name: "Libros",
    tagline: "Libros escolares del proyecto",
    description: "Libros habilitados por el docente para este proyecto.",
    categories: ["Educación"],
    subcategory: "Herramientas",
    cover: "",
    features: [],
    appVersion: "1.0.0",
    versionLabel: "Libros",
    upstream: { name: "Aula Kanban", version: "" },
    window: { width: 920, height: 640 },
    icon: BookOpen,
    roles: ["owner", "admin", "teacher", "student", "guest"],
  };
  const bookWindowIds = new Set(openBookIds.filter((id) => bookIds.includes(id)));
  const shownWindows = configured === null ? windows : windows.filter((item) => {
    const isFolder = item.tool.id.startsWith("folder:");
    return desktopIds.has(item.tool.id)
      || (item.tool.id === "books" && bookIds.length > 0)
      || (item.tool.id.startsWith("book-") && bookWindowIds.has(item.tool.id.slice(5)))
      || (isFolder && folderNames.has(item.tool.id.slice(7)))
      || item.tool.id === ORGANIZER_ID;
  });

  function openOrganizer() {
    setDraft(Object.fromEntries(apps.map((app) => [app.id, app.folder ?? ""])));
    setSaveError("");
    setSaved(false);
    open(organizerTool);
  }

  async function saveFolders() {
    const items = apps.map((app) => ({
      id: app.id,
      favorite: app.favorite,
      position: app.position,
      folder: folderName(draft[app.id] ?? ""),
    }));
    if (items.some((item) => (item.folder?.length ?? 0) > 40)) {
      setSaveError("El nombre de la carpeta no puede superar 40 caracteres.");
      return;
    }
    setSaving(true);
    setSaveError("");
    setSaved(false);
    try {
      const response = await fetch(`/api/personal-apps?project=${encodeURIComponent(projectId)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = (await response.json().catch(() => null)) as { apps?: PersonalAppRow[]; message?: string } | null;
      if (!response.ok || !data?.apps) throw new Error(data?.message ?? "No se pudieron guardar tus carpetas.");
      setApps(data.apps);
      setDraft(Object.fromEntries(data.apps.map((app) => [app.id, app.folder ?? ""])));
      setSaved(true);
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "No se pudieron guardar tus carpetas.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <MotionConfig reducedMotion="user">
    <LazyMotion features={domAnimation}>
    <section className="store-view personal-space" aria-label={title}>
      <div className="store-desktop" ref={desktopRef} aria-label="Escritorio personal">
        {error && <p role="alert" className="store-empty">{error}{" "}<button type="button" className="text-button" onClick={() => void refresh()}>Reintentar</button></p>}
        {configured === null ? (
          <p className="store-empty">Cargando tus herramientas…</p>
        ) : !error && desktopTools.length === 0 ? (
          <p className="store-empty">Todavía no hay herramientas instaladas en esta instancia.</p>
        ) : null}
        {apps.length > 0 && (
          <button type="button" className="personal-organize" onClick={openOrganizer}>
            <Settings2 size={15} aria-hidden /> Organizar
          </button>
        )}
        <div className="store-icons">
          {entries.map((entry) => {
            if (entry.kind === "folder") {
              return (
                <div key={`folder:${entry.folder.name}`}>
                  <button
                    type="button"
                    className="store-tool personal-folder-tool"
                    onClick={() => open(folderTool(entry.folder.name))}
                    title={`Carpeta ${entry.folder.name}`}
                    aria-label={`Abrir carpeta ${entry.folder.name}`}
                  >
                    <span className="store-tool-icon personal-folder-icon" aria-hidden><Folder size={30} strokeWidth={2} /></span>
                    <span className="store-tool-name">{entry.folder.name}</span>
                  </button>
                </div>
              );
            }
            const Icon = entry.tool.icon;
            return (
              <div key={entry.tool.id}>
              <button type="button" className="store-tool" onClick={() => open(entry.tool)} title={entry.tool.description}>
                <span className="store-tool-icon" aria-hidden><Icon size={28} strokeWidth={2} /></span>
                <span className="store-tool-name">{entry.tool.name}</span>
              </button>
              </div>
            );
          })}
          {bookIds.length > 0 && (
            <div key="books">
              <button type="button" className="store-tool" onClick={() => open(booksTool)} title={booksTool.description}>
                <span className="store-tool-icon" aria-hidden><BookOpen size={28} strokeWidth={2} /></span>
                <span className="store-tool-name">Libros</span>
              </button>
            </div>
          )}
        </div>
        <nav className="store-dock" aria-label="Ventanas minimizadas">
          {shownWindows.filter((item) => item.minimized).map((item) => {
            const Icon = item.tool.icon;
            return (
              <button key={item.tool.id} type="button" className="store-minimized-icon" title={`${item.tool.name} (minimizada)`} aria-label={`Restaurar ${item.tool.name}`} onClick={() => restore(item.tool.id)}>
                <Icon size={18} strokeWidth={2} />
              </button>
            );
          })}
        </nav>
        <AnimatePresence>
        {shownWindows.map((item) => {
          const App = toolApps[item.tool.id];
          const isBooks = item.tool.id === "books";
          const isBookViewer = item.tool.id.startsWith("book-");
          const isOrganizer = item.tool.id === ORGANIZER_ID;
          const folder = item.tool.id.startsWith("folder:")
            ? folders.find((candidate) => `folder:${candidate.name}` === item.tool.id)
            : undefined;
          return (
            <StoreWindow
              key={item.tool.id}
              title={item.tool.name}
              position={item.maximized ? { x: 0, y: 0 } : item.position}
              size={item.maximized && desktopSize.width && desktopSize.height ? desktopSize : item.size}
              bounds={desktopSize}
              zIndex={item.zIndex}
              maximized={item.maximized}
              minimized={item.minimized}
              onMove={(position) => move(item.tool.id, position)}
              onResize={(size) => resize(item.tool.id, size)}
              onFocus={() => focus(item.tool.id)}
              onClose={() => close(item.tool.id)}
              onMinimize={() => minimize(item.tool.id)}
              onZoom={() => zoom(item.tool.id)}
            >
              {isOrganizer ? (
                <div className="personal-organizer">
                  <p className="personal-organizer-intro">Escribe el nombre de una carpeta para agrupar cada app. Déjalo vacío para dejarla suelta en el escritorio.</p>
                  <div className="personal-organizer-rows">
                    {apps.map((app) => (
                      <label key={app.id} className="personal-organizer-row">
                        <span>{app.name}</span>
                        <input
                          type="text"
                          maxLength={40}
                          placeholder="Sin carpeta"
                          aria-label={`Carpeta de ${app.name}`}
                          value={draft[app.id] ?? ""}
                          onChange={(event) => {
                            setDraft((current) => ({ ...current, [app.id]: event.target.value }));
                            setSaved(false);
                          }}
                        />
                      </label>
                    ))}
                  </div>
                  <div className="personal-organizer-footer">
                    {saveError && <p role="alert" className="personal-organizer-error">{saveError}</p>}
                    {saved && <span role="status" className="personal-organizer-saved">Guardado</span>}
                    <button type="button" className="personal-organizer-save" disabled={saving} onClick={() => void saveFolders()}>
                      {saving ? "Guardando…" : "Guardar carpetas"}
                    </button>
                  </div>
                </div>
              ) : folder ? (
                <div className="personal-folder-window" role="group" aria-label={`Apps en ${folder.name}`}>
                  {folder.tools.map((tool) => {
                    const Icon = tool.icon;
                    return (
                      <button key={tool.id} type="button" className="personal-folder-app" onClick={() => open(tool)} title={tool.description}>
                        <span className="personal-folder-app-icon" aria-hidden><Icon size={20} strokeWidth={2} /></span>
                        <span>{tool.name}</span>
                      </button>
                    );
                  })}
                </div>
              ) : isBooks ? (
                <BooksFolder projectId={projectId} onOpen={(book) => { open(bookTool(book)); setOpenBookIds((current) => [...new Set([...current, book.id])]); }} />
              ) : isBookViewer ? (
                <BookViewer projectId={projectId} bookId={item.tool.id.slice(5)} />
              ) : App ? <Suspense fallback={<p className="store-loading">Cargando {item.tool.name}…</p>}><App projectId={projectId} role={role} /></Suspense> : <p className="store-loading">Próximamente.</p>}
            </StoreWindow>
          );
        })}
        </AnimatePresence>
      </div>
    </section>
    </LazyMotion>
    </MotionConfig>
  );
}
