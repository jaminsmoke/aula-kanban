"use client";

import { useMemo, useState } from "react";
import BohrModel from "./bohr-model";
import { ELEMENTS, type PeriodicElement } from "./periodic-data";
import "./periodic-table-es.css";

const CATEGORY_LABELS: Record<string, string> = {
  alkali: "Metal alcalino",
  alkaline: "Metal alcalinotérreo",
  transition: "Metal de transición",
  post: "Metal postransicional",
  metalloid: "Semimetal",
  diatomic: "No metal diatómico",
  polyatomic: "No metal poliatómico",
  noble: "Gas noble",
  lanthanide: "Lantánido",
  actinide: "Actínido",
  unknown: "Desconocido",
};

const CATEGORY_ORDER = [
  "alkali", "alkaline", "transition", "post", "metalloid",
  "diatomic", "polyatomic", "noble", "lanthanide", "actinide",
];

const PHASE_LABELS: Record<string, string> = {
  Gas: "Gas",
  Solid: "Sólido",
  Liquid: "Líquido",
};

const PHASE_TEXT: Record<string, string> = {
  Gas: "gas",
  Solid: "sólido",
  Liquid: "líquido",
};

/**
 * Formatea un número con coma decimal.
 * @param value - Número que se quiere mostrar.
 * @param digits - Máximo de decimales.
 * @returns El número formateado en español.
 */
function format(value: number, digits = 2): string {
  return value.toLocaleString("es-ES", { maximumFractionDigits: digits });
}

/**
 * Convierte kelvin a grados Celsius legibles.
 * @param kelvin - Temperatura en kelvin.
 * @returns La temperatura en grados Celsius.
 */
function celsius(kelvin: number): string {
  return `${format(kelvin - 273.15, 1)} °C`;
}

/**
 * Descripción en español del elemento a partir de sus datos.
 * @param element - Elemento que se describe.
 * @returns Un párrafo con categoría, posición, masa, densidad, temperaturas y descubrimiento.
 */
function describe(element: PeriodicElement): string {
  const category = CATEGORY_LABELS[element.category].toLowerCase();
  const phase = PHASE_TEXT[element.phase] ?? "estado desconocido";
  const predicted = element.predicted ? " (categoría estimada)" : "";
  const parts = [
    `${element.name} (${element.symbol}, número atómico ${element.number}) es un ${category}${predicted}`
      + ` del grupo ${element.group || "—"} y periodo ${element.period}, en estado ${phase} a temperatura ambiente.`,
    `Su masa atómica es ${format(element.mass, 4)} u.`,
  ];

  if (element.density !== null) {
    parts.push(`Su densidad es de ${format(element.density, 4)} ${phase === "gas" ? "g/L" : "g/cm³"}.`);
  }
  if (element.melt !== null && element.boil !== null) {
    parts.push(`Se funde a ${format(element.melt)} K (${celsius(element.melt)}) y hierve a ${format(element.boil)} K (${celsius(element.boil)}).`);
  } else if (element.melt !== null) {
    parts.push(`Se funde a ${format(element.melt)} K (${celsius(element.melt)}).`);
  } else if (element.boil !== null) {
    parts.push(`Hierve a ${format(element.boil)} K (${celsius(element.boil)}).`);
  }
  if (element.electronConfiguration) {
    const electronegativity = element.electronegativity !== null
      ? ` y su electronegatividad de Pauling es ${format(element.electronegativity)}`
      : "";
    parts.push(`Su configuración electrónica es ${element.electronConfiguration}${electronegativity}.`);
  }

  const discoverer = knownValue(element.discoveredBy);
  if (discoverer) parts.push(`Fue descubierto por ${discoverer}.`);

  return parts.join(" ");
}

/**
 * Descarta los valores vacíos o "unknown" del catálogo original.
 * @param value - Valor del catálogo.
 * @returns El valor limpio o `null` si no aporta información.
 */
function knownValue(value: string | null): string | null {
  if (!value) return null;
  return value.trim().toLowerCase() === "unknown" ? null : value;
}

/**
 * Quita tildes y mayúsculas para buscar sin preocuparse por la ortografía.
 * @param value - Texto que se quiere normalizar.
 * @returns El texto en minúsculas y sin diacríticos.
 */
function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * Posición de cada elemento en la cuadrícula de 18 columnas.
 * @param element - Elemento del que se calcula la celda.
 * @returns Fila y columna de la cuadrícula.
 */
function positionOf(element: PeriodicElement): { row: number; column: number } {
  if (element.number >= 57 && element.number <= 71) return { row: 9, column: element.number - 54 };
  if (element.number >= 89 && element.number <= 103) return { row: 10, column: element.number - 86 };
  return { row: element.period, column: element.group };
}

/**
 * Tabla periódica en español: búsqueda por nombre, símbolo o número, filtros por
 * categoría y bloque, y ficha del elemento seleccionado.
 * @returns La tabla periódica interactiva.
 */
export default function PeriodicTableEs() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("todas");
  const [block, setBlock] = useState("todos");
  const [selected, setSelected] = useState<number | null>(null);
  const [detailTab, setDetailTab] = useState<"ficha" | "descripcion" | "historia">("ficha");

  const matches = useMemo(() => {
    const text = normalize(query.trim());
    return (element: PeriodicElement) => {
      if (category !== "todas" && element.category !== category) return false;
      if (block !== "todos" && element.block !== block) return false;
      if (!text) return true;
      return normalize(element.name).includes(text)
        || normalize(element.englishName).includes(text)
        || element.symbol.toLowerCase().includes(text)
        || String(element.number) === text;
    };
  }, [query, category, block]);

  const visible = ELEMENTS.filter(matches).length;
  const selectedElement = ELEMENTS.find((element) => element.number === selected) ?? null;

  return (
    <div className="pt-es">
      <div className="pt-toolbar">
        <label className="pt-search">
          <span className="pt-sr">Buscar elemento</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre, símbolo o número"
          />
        </label>
        <label className="pt-select">
          <span>Categoría</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="todas">Todas</option>
            {CATEGORY_ORDER.map((key) => (
              <option key={key} value={key}>{CATEGORY_LABELS[key]}</option>
            ))}
          </select>
        </label>
        <label className="pt-select">
          <span>Bloque</span>
          <select value={block} onChange={(event) => setBlock(event.target.value)}>
            <option value="todos">Todos</option>
            <option value="s">s</option>
            <option value="p">p</option>
            <option value="d">d</option>
            <option value="f">f</option>
          </select>
        </label>
        <span className="pt-count" role="status">{visible} de {ELEMENTS.length}</span>
      </div>

      <div className="pt-body">
        <div className="pt-scroll">
          <div className="pt-grid" role="grid" aria-label="Tabla periódica de los elementos">
            {ELEMENTS.map((element) => {
              const { row, column } = positionOf(element);
              const active = matches(element);
              return (
                <button
                  key={element.number}
                  type="button"
                  role="gridcell"
                  className={`pt-cell pt-cat-${element.category}${element.predicted ? " is-predicted" : ""}${active ? "" : " is-dim"}${selected === element.number ? " is-selected" : ""}`}
                  style={{ gridRow: row, gridColumn: column }}
                  aria-selected={selected === element.number}
                  aria-label={`${element.name}, símbolo ${element.symbol}, número atómico ${element.number}${element.predicted ? ", categoría predicha" : ""}`}
                  tabIndex={active ? 0 : -1}
                  onClick={() => { setSelected(element.number); setDetailTab("ficha"); }}
                >
                  <span className="pt-number">{element.number}</span>
                  <span className="pt-symbol">{element.symbol}</span>
                </button>
              );
            })}
            <div className="pt-series" style={{ gridRow: 6, gridColumn: 3 }} aria-hidden>57–71</div>
            <div className="pt-series" style={{ gridRow: 7, gridColumn: 3 }} aria-hidden>89–103</div>
          </div>
        </div>

        <aside className="pt-detail" aria-live="polite">
          {selectedElement ? (
            <>
              <div className={`pt-detail-head pt-cat-${selectedElement.category}${selectedElement.predicted ? " is-predicted" : ""}`}>
                <div className="pt-detail-id">
                  <span className="pt-detail-number">{selectedElement.number}</span>
                  <strong>{selectedElement.symbol}</strong>
                </div>
                <div className="pt-detail-heading">
                  <span className="pt-detail-name">{selectedElement.name}</span>
                  <span className="pt-detail-cat">
                    {CATEGORY_LABELS[selectedElement.category]}{selectedElement.predicted ? " · predicha" : ""}
                  </span>
                </div>
              </div>
              <div className="pt-tabs" role="tablist" aria-label="Contenido de la ficha">
                {([
                  { id: "ficha", label: "Ficha" },
                  { id: "descripcion", label: "Descripción" },
                  { id: "historia", label: "Historia" },
                ] as const).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    className="pt-tab"
                    aria-selected={detailTab === tab.id}
                    aria-controls={`pt-panel-${tab.id}`}
                    id={`pt-tab-${tab.id}`}
                    onClick={() => setDetailTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="pt-tabpanel" role="tabpanel" id={`pt-panel-${detailTab}`} aria-labelledby={`pt-tab-${detailTab}`}>
                {detailTab === "ficha" ? (
                  <>
                    <BohrModel shells={selectedElement.shells} symbol={selectedElement.symbol} />
                    <dl className="pt-detail-list">
                      <div><dt>Masa atómica</dt><dd>{selectedElement.mass} u</dd></div>
                      <div><dt>Grupo</dt><dd>{selectedElement.group || "—"}</dd></div>
                      <div><dt>Periodo</dt><dd>{selectedElement.period}</dd></div>
                      <div><dt>Bloque</dt><dd>{selectedElement.block || "—"}</dd></div>
                      <div><dt>Fase</dt><dd>{PHASE_LABELS[selectedElement.phase] ?? selectedElement.phase}</dd></div>
                      <div><dt>Configuración</dt><dd>{selectedElement.electronConfiguration}</dd></div>
                      {selectedElement.electronegativity !== null ? <div><dt>Electronegatividad</dt><dd>{selectedElement.electronegativity}</dd></div> : null}
                      {selectedElement.density !== null ? <div><dt>Densidad</dt><dd>{selectedElement.density} g/cm³</dd></div> : null}
                      {selectedElement.melt !== null ? <div><dt>Fusión</dt><dd>{selectedElement.melt} K</dd></div> : null}
                      {selectedElement.boil !== null ? <div><dt>Ebullición</dt><dd>{selectedElement.boil} K</dd></div> : null}
                    </dl>
                  </>
                ) : null}

                {detailTab === "descripcion" ? (
                  <p className="pt-text">{describe(selectedElement)}</p>
                ) : null}

                {detailTab === "historia" ? (
                  <>
                    <dl className="pt-detail-list">
                      <div><dt>Descubierto por</dt><dd>{knownValue(selectedElement.discoveredBy) ?? "No consta"}</dd></div>
                      <div><dt>Nombrado por</dt><dd>{knownValue(selectedElement.namedBy) ?? "No consta"}</dd></div>
                    </dl>
                    <a
                      className="pt-link"
                      href={`https://es.wikipedia.org/wiki/${encodeURIComponent(selectedElement.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Ver en Wikipedia
                    </a>
                  </>
                ) : null}
              </div>
            </>
          ) : (
            <p className="pt-empty">Selecciona un elemento para ver su ficha.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
