import { lazy, Suspense, useEffect, type ChangeEvent, type KeyboardEvent } from "react";
import { Ellipsis, MonitorPlay, Save, X } from "lucide-react";
import { AULA_IMAGE_ACCEPT } from "../../../../../lib/domain/aula-documentos/image";
import { AulaMenu, type AulaMenuAction } from "../aula-documentos-menu";
import type { ToolbarAction } from "../aula-documentos-types";
import { useAulaDocumentosView } from "../aula-documentos-context";

const TableUi = lazy(() => import("../aula-documentos-table-tools").then((module) => ({
  default: module.AulaTableUi,
})));

const MOBILE_MENU_ID = "aula-documentos-mobile-actions";

/**
 * Botón de la barra de formato.
 * @param props - Acción y estado del botón.
 * @returns El botón accesible.
 */
function ToolButton({ action }: { action: ToolbarAction }) {
  return (
    <button
      type="button"
      className={`aula-documentos-tool${action.active ? " is-active" : ""}`}
      data-action-id={action.id}
      onClick={action.onClick}
      aria-label={action.label}
      title={action.label}
      aria-pressed={action.active === undefined ? undefined : action.active}
      disabled={action.disabled}
    >
      {action.icon}
    </button>
  );
}

/**
 * Menú de acciones con etiquetas visibles en pantallas estrechas.
 * @param props - Acciones y selector.
 * @returns Los elementos del menú.
 */
function MobileActions({
  groups,
  onSelect,
}: {
  groups: Array<{ id: string; label: string; actions: AulaMenuAction[] }>;
  onSelect: (action: AulaMenuAction) => void;
}) {
  return (
    <>
      {groups.filter((group) => group.actions.length > 0).map((group) => (
        <div className="aula-documentos-mobile-action-group" role="group" aria-label={group.label} key={group.id}>
          <p className="aula-documentos-mobile-action-title" aria-hidden="true">{group.label}</p>
          {group.actions.map((action) => (
            <button
              type="button"
              role={action.active === undefined ? "menuitem" : "menuitemcheckbox"}
              aria-checked={action.active === undefined ? undefined : action.active}
              data-action-id={action.id}
              key={action.id}
              disabled={action.disabled}
              onClick={() => onSelect(action)}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      ))}
    </>
  );
}

/**
 * Barra de comandos, acciones y panel de enlaces.
 * @returns El componente de la vista.
 */
export function DocumentToolbar() {
  const {
    archiveMenuActions,
    importMenuActions,
    exportMenuActions,
    presentAction,
    saveDocumentAction,
    actionsRef,
    actionsToggleRef,
    actionsOpen,
    setActionsOpen,
    mobileFormatMenuActions,
    editor,
    readOnly,
    mobileActionGroups,
    officeOpenInputRef,
    openOfficeViewer,
    prepareCopyImport,
    insertImageFiles,
    formatMenuActions,
    insertMenuActions,
    groups,
    linkOpen,
    setLinkOpen,
    linkUrl,
    setLinkUrl,
    linkError,
    setLinkError,
    applyLink,
    removeLink,
    toolbar,
  } = useAulaDocumentosView();

  useEffect(() => {
    if (!actionsOpen) return;
    const first = actionsRef.current?.querySelector<HTMLElement>(".aula-documentos-mobile-menu button:not(:disabled)");
    first?.focus();
  }, [actionsOpen, actionsRef]);

  /**
   * Recorre las acciones móviles con las flechas y cierra con Escape o Tab.
   * @param event - Evento de teclado del menú móvil.
   */
  function onMobileActionsKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" || event.key === "Tab") {
      event.preventDefault();
      setActionsOpen(false);
      actionsToggleRef.current?.focus();
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const items = Array.from(
      actionsRef.current?.querySelectorAll<HTMLElement>(".aula-documentos-mobile-menu button:not(:disabled)") ?? [],
    );
    if (!items.length) return;
    event.preventDefault();
    const active = items.indexOf(document.activeElement as HTMLElement);
    const next = event.key === "Home"
      ? 0
      : event.key === "End"
        ? items.length - 1
        : event.key === "ArrowDown"
          ? (active + 1) % items.length
          : (active - 1 + items.length) % items.length;
    items[next]?.focus();
  }

  return (
    <>
      <div className="aula-documentos-commandbar" role="toolbar" aria-label="Menús del documento">
        <div className="aula-documentos-menubar">
          <AulaMenu label="Archivo" actions={archiveMenuActions} />
          <AulaMenu label="Importar" actions={importMenuActions} />
          <AulaMenu label="Exportar" actions={exportMenuActions} />
        </div>
        <div className="aula-documentos-desktop-actions">
          <button
            type="button"
            className="aula-documentos-action-button"
            data-action-id={presentAction.id}
            onClick={presentAction.onClick}
            disabled={presentAction.disabled}
            aria-label="Presentar documento"
          >
            <MonitorPlay size={14} aria-hidden />
            <span>Presentar</span>
          </button>
          <button
            type="button"
            className="aula-documentos-action-button primary"
            data-action-id={saveDocumentAction.id}
            onClick={saveDocumentAction.onClick}
            disabled={saveDocumentAction.disabled}
            aria-label="Guardar documento"
          >
            <Save size={14} aria-hidden />
            <span>Guardar</span>
          </button>
        </div>
        <div className="aula-documentos-mobile-actions" ref={actionsRef}>
          <AulaMenu
            label="Formato"
            ariaLabel="Formato del documento"
            actions={mobileFormatMenuActions}
            disabled={!editor || readOnly}
          />
          <div className="aula-documentos-mobile-menu-anchor">
            <button
              type="button"
              className="aula-documentos-mobile-toggle"
              ref={actionsToggleRef}
              aria-haspopup="menu"
              aria-expanded={actionsOpen}
              aria-controls={actionsOpen ? MOBILE_MENU_ID : undefined}
              aria-label="Acciones del documento"
              onClick={() => setActionsOpen((current) => !current)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActionsOpen(true);
                }
              }}
            >
              <Ellipsis size={16} aria-hidden />
              <span>Acciones</span>
            </button>
            {actionsOpen ? (
              <div
                className="aula-documentos-mobile-menu"
                id={MOBILE_MENU_ID}
                role="menu"
                aria-label="Acciones del documento"
                onKeyDown={onMobileActionsKeyDown}
              >
                <MobileActions
                  groups={mobileActionGroups}
                  onSelect={(action) => {
                    setActionsOpen(false);
                    actionsToggleRef.current?.focus();
                    action.onSelect();
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <input
        ref={officeOpenInputRef}
        className="aula-documentos-file-input"
        type="file"
        accept=".docx,.xlsx,.pptx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation"
        aria-label="Elegir archivo de Office para el visor"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          openOfficeViewer(file);
        }}
      />

      <input
        id="aula-documentos-image-file"
        className="aula-documentos-file-input"
        type="file"
        accept={AULA_IMAGE_ACCEPT}
        aria-label="Elegir imagen para el documento"
        tabIndex={-1}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void insertImageFiles([file]);
        }}
      />

      <input
        id="aula-documentos-copy-file"
        className="aula-documentos-file-input"
        type="file"
        accept=".zip,.aula.zip,application/zip,application/x-zip-compressed"
        aria-label="Elegir copia portable para importar"
        tabIndex={-1}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          void prepareCopyImport(file);
        }}
      />

      <div className="aula-documentos-toolbar" role="toolbar" aria-label="Herramientas del documento">
        <div className="aula-documentos-edit-menus">
          <AulaMenu label="Formato" actions={formatMenuActions} disabled={!editor || readOnly} />
          <AulaMenu label="Insertar" actions={insertMenuActions} disabled={!editor || readOnly} />
        </div>
        <div className="aula-documentos-direct-tools">
          {groups.map((group, index) => (
            <div className="aula-documentos-tool-group" key={index}>
              {group.map((action) => <ToolButton action={action} key={action.label} />)}
            </div>
          ))}
        </div>
        <Suspense fallback={null}>
          <TableUi editor={editor} readOnly={readOnly} />
        </Suspense>
        {!editor ? <span className="aula-documentos-loading">Preparando editor...</span> : null}
      </div>
      {readOnly ? (
        <p className="aula-documentos-readonly" role="note">
          Modo lectura: puedes consultar y exportar el documento, pero no editarlo ni guardarlo.
        </p>
      ) : null}

      {linkOpen && !readOnly ? (
        <form
          className="aula-documentos-link-bar"
          onSubmit={(event) => {
            event.preventDefault();
            applyLink();
          }}
        >
          <label className="aula-documentos-link-label" htmlFor="aula-documentos-link-url">Enlace</label>
          <input
            id="aula-documentos-link-url"
            className="aula-documentos-link-input"
            type="text"
            inputMode="url"
            autoFocus
            value={linkUrl}
            onChange={(event) => {
              setLinkUrl(event.target.value);
              setLinkError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setLinkOpen(false);
            }}
            placeholder="https://ejemplo.com o nombre@correo.com"
            aria-describedby={linkError ? "aula-documentos-link-error" : undefined}
          />
          <button type="submit" className="aula-documentos-link-action" disabled={!linkUrl.trim()}>Aplicar</button>
          {toolbar.link ? (
            <button type="button" className="aula-documentos-link-action secondary" onClick={removeLink}>Quitar</button>
          ) : null}
          <button type="button" className="aula-documentos-link-close" onClick={() => setLinkOpen(false)} aria-label="Cerrar enlace">
            <X size={14} aria-hidden />
          </button>
          {linkError ? (
            <span id="aula-documentos-link-error" className="aula-documentos-link-error" role="alert">{linkError}</span>
          ) : (
            <span className="aula-documentos-link-hint">Solo http, https o correo.</span>
          )}
        </form>
      ) : null}

    </>
  );
}
