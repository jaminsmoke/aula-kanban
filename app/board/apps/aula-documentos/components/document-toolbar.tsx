import { lazy, Suspense, type ChangeEvent } from "react";
import { Ellipsis, MonitorPlay, Save, X } from "lucide-react";
import { AULA_IMAGE_ACCEPT } from "../../../../../lib/domain/aula-documentos/image";
import { AulaMenu } from "../aula-documentos-menu";
import type { ToolbarAction } from "../aula-documentos-types";
import { useAulaDocumentosView } from "../aula-documentos-context";

const TableUi = lazy(() => import("../aula-documentos-table-tools").then((module) => ({
  default: module.AulaTableUi,
})));

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
  actions,
  onSelect,
}: {
  actions: ToolbarAction[];
  onSelect: (action: ToolbarAction) => void;
}) {
  return (
    <>
      {actions.map((action) => (
        <button
          type="button"
          role="menuitem"
          key={action.label}
          disabled={action.disabled}
          onClick={() => onSelect(action)}
        >
          {action.icon}
          <span>{action.label}</span>
        </button>
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
    chipText,
    dirty,
    saveConflict,
    wordLabel,
    diagramLabel,
    presentAction,
    saveDocumentAction,
    actionsRef,
    actionsToggleRef,
    actionsOpen,
    setActionsOpen,
    mobileFormatMenuActions,
    editor,
    readOnly,
    mobileActions,
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

  return (
    <>
      <div className="aula-documentos-commandbar" role="toolbar" aria-label="Menus del documento">
        <div className="aula-documentos-menubar">
          <AulaMenu label="Archivo" actions={archiveMenuActions} />
          <AulaMenu label="Importar" actions={importMenuActions} />
          <AulaMenu label="Exportar" actions={exportMenuActions} />
        </div>
        <div className="aula-documentos-meta" aria-label="Estado del documento">
          <span className={(dirty || saveConflict) && !readOnly ? "aula-documentos-chip is-dirty" : "aula-documentos-chip"}>
            {chipText}
          </span>
          <span className="aula-documentos-count">{wordLabel}</span>
          <span className="aula-documentos-count">{diagramLabel}</span>
        </div>
        <div className="aula-documentos-desktop-actions">
          <button
            type="button"
            className="aula-documentos-action-button"
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
              aria-label="Acciones del documento"
              onClick={() => setActionsOpen((current) => !current)}
            >
              <Ellipsis size={16} aria-hidden />
              <span>Acciones</span>
            </button>
            {actionsOpen ? (
              <div className="aula-documentos-mobile-menu" role="menu" aria-label="Acciones del documento">
                <MobileActions
                  actions={mobileActions}
                  onSelect={(action) => {
                    setActionsOpen(false);
                    action.onClick();
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
