"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import type { StoreTool } from "../tools";
import { statusLabel } from "./store-model";

/**
 * Ficha técnica compartida por apps individuales y suites.
 * @param props.tool - Herramienta del catálogo.
 * @returns La lista de versión, upstream y ampliaciones.
 */
function TechnicalInfo({ tool }: { tool: StoreTool }) {
  return (
    <dl className="store-detail-tech" aria-label="Información de versión">
      <div>
        <dt>Versión de {tool.versionLabel ?? tool.name}</dt>
        <dd>{tool.appVersion}</dd>
      </div>
      {tool.upstream ? (
        <div>
          <dt>Upstream</dt>
          <dd>{tool.upstream.name} {tool.upstream.version}</dd>
        </div>
      ) : null}
      {tool.extras?.length ? (
        <div>
          <dt>Ampliaciones</dt>
          <dd>{tool.extras.map((extra) => `${extra.name} ${extra.version}`).join(" · ")}</dd>
        </div>
      ) : null}
    </dl>
  );
}

/**
 * Ficha de detalle de una aplicación o de una suite.
 * @param props - Herramienta, estado, acciones y cierre.
 * @returns El diálogo de detalle.
 */
export default function StoreDetail({ tool, status, isAdmin, actions, onClose }: {
  tool: StoreTool;
  status: string;
  isAdmin: boolean;
  actions: ReactNode;
  onClose: () => void;
}) {
  const Icon = tool.icon;
  const suite = tool.suite;

  return (
    <div className="store-detail" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div
        className={`store-detail-card${suite ? " store-detail-card--suite" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={tool.name}
      >
        <button type="button" className="store-detail-close" aria-label="Cerrar detalles" onClick={onClose} autoFocus><X size={18} aria-hidden /></button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="store-detail-cover" src={tool.cover} alt="" />
        <div className="store-detail-body">
          <div className="store-detail-head">
            <span className="store-card-icon store-card-icon--static" aria-hidden><Icon size={24} strokeWidth={2} /></span>
            <div className="store-detail-title">
              <h3>{tool.name}</h3>
              <p>{tool.categories.join(" · ")} · {tool.subcategory} · {statusLabel(status)}</p>
            </div>
          </div>

          {suite ? (
            <div className="store-suite">
              <p className="store-detail-promise">{suite.promise}</p>
              <p className="store-detail-description">{tool.description}</p>

              <ul className="store-suite-modules" aria-label="Módulos incluidos">
                {suite.modules.map((module) => <li key={module}>{module}</li>)}
              </ul>

              <div className="store-suite-capabilities">
                {suite.capabilities.map((group) => (
                  <section key={group.title} aria-label={group.title}>
                    <h4>{group.title}</h4>
                    <ul>
                      {group.items.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </section>
                ))}
              </div>

              <dl className="store-suite-formats" aria-label="Formatos compatibles">
                <div>
                  <dt>Abre</dt>
                  <dd>{suite.formats.open.map((format) => <span className="store-suite-chip" key={format}>{format}</span>)}</dd>
                </div>
                <div>
                  <dt>Exporta</dt>
                  <dd>{suite.formats.export.map((format) => <span className="store-suite-chip" key={format}>{format}</span>)}</dd>
                </div>
              </dl>

              {suite.migration ? (
                <aside className="store-suite-migration" aria-label="Migración">
                  <h4>Migración</h4>
                  <p>{suite.migration.note}</p>
                  <ul className="store-suite-replaces" aria-label="Apps sustituidas">
                    {suite.migration.replaces.map((source) => <li key={source.id}>{source.name}</li>)}
                  </ul>
                </aside>
              ) : null}

              {suite.screenshots?.length ? (
                <div className="store-suite-screenshots" aria-label="Capturas">
                  {suite.screenshots.map((screenshot) => (
                    <figure key={screenshot.src}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={screenshot.src} alt={screenshot.alt} loading="lazy" />
                      {screenshot.caption ? <figcaption>{screenshot.caption}</figcaption> : null}
                    </figure>
                  ))}
                </div>
              ) : null}

              <details className="store-detail-tech-details">
                <summary>Ficha técnica</summary>
                <TechnicalInfo tool={tool} />
              </details>
            </div>
          ) : (
            <>
              <p className="store-detail-description">{tool.description}</p>
              <ul className="store-detail-features">
                {tool.features.map((feature) => <li key={feature}>{feature}</li>)}
              </ul>
              <TechnicalInfo tool={tool} />
            </>
          )}

          {!isAdmin && status !== "installed" ? (
            <p className="store-detail-note">Solo el propietario o un administrador puede instalar aplicaciones.</p>
          ) : null}
          <div className="store-detail-actions">
            {actions}
          </div>
        </div>
      </div>
    </div>
  );
}
