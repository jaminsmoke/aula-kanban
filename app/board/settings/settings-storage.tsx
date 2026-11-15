"use client";

import { useEffect, useState } from "react";
import type { InventoryEntry, InventoryStatus } from "../../../lib/domain/uploads/inventory";

type UploadStats = {
  total: number;
  rows: Array<{ origin: string; purpose: string; count: number; bytes: number; maxBytes: number; over1mb: number; over2mb: number }>;
};

type StorageStatus = {
  database: boolean;
  bucket: boolean;
  bucketReachable: boolean;
  uploads: number | null;
  ok: boolean;
  uploadStats?: UploadStats | null;
};

type PurgeReport = {
  simulated: boolean;
  projects: number;
  candidates: number;
  deleted: number;
  skipped: number;
  failed: number;
  bytes: number;
  hasMore: boolean;
  problems: Array<{ projectId: string; reason: string }>;
};

type InventoryPage = {
  entries: InventoryEntry[];
  truncated: boolean;
  cursor: string | null;
};

/** Etiqueta legible de cada estado del inventario. */
const ESTADOS: Record<InventoryStatus, string> = {
  con_fila: "Con fila",
  objeto_sin_fila: "Objeto sin fila",
  fila_sin_objeto: "Fila sin objeto",
  clave_revisar: "Revisar clave",
};

/**
 * Da formato legible a un tamaño en bytes.
 * @param bytes - Tamaño recibido.
 * @returns El tamaño en B o KB.
 */
function peso(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/**
 * Concuerda una cantidad con su sustantivo.
 * @param cantidad - Número de elementos.
 * @param singular - Sustantivo en singular.
 * @param plural - Sustantivo en plural.
 * @returns La cantidad con la forma correcta.
 */
function plural(cantidad: number, singular: string, plural: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}

/**
 * Da formato a la fecha de subida de un objeto.
 * @param ms - Milisegundos desde la época.
 * @returns La fecha en formato ISO corto.
 */
function fecha(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Estado del almacenamiento de archivos para propietario y administración,
 * con simulación y limpieza de los huérfanos.
 * @returns El panel de diagnóstico y limpieza de D1 y R2.
 */
export default function SettingsStorage() {
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [error, setError] = useState("");
  const [purge, setPurge] = useState<PurgeReport | null>(null);
  const [purgeError, setPurgeError] = useState("");
  const [working, setWorking] = useState<"simular" | "limpiar" | null>(null);
  const [inventoryEntries, setInventoryEntries] = useState<InventoryEntry[]>([]);
  const [inventory, setInventory] = useState<{ truncated: boolean; cursor: string | null } | null>(null);
  const [inventoryError, setInventoryError] = useState("");
  const [inventoryWorking, setInventoryWorking] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/storage/status")
      .then(async (response) => {
        const data = await response.json().catch(() => null) as StorageStatus & { message?: unknown } | null;
        if (!response.ok || !data || typeof data.ok !== "boolean") {
          throw new Error(data && typeof data.message === "string" ? data.message : "No se pudo comprobar el almacenamiento.");
        }
        return data;
      })
      .then((data) => { if (active) setStatus(data); })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "No se pudo comprobar el almacenamiento."); });
    return () => { active = false; };
  }, []);

  /**
   * Ejecuta o simula la limpieza de archivos sin uso.
   * @param simulacion - `true` para no borrar nada.
   */
  async function runPurge(simulacion: boolean) {
    if (!simulacion && !window.confirm("Se borrarán de R2 y de los metadatos los archivos sin uso con más de 7 días. Los archivos referenciados por tareas, pizarras o documentos no se tocan. ¿Continuar?")) return;
    setWorking(simulacion ? "simular" : "limpiar");
    setPurgeError("");
    try {
      const response = await fetch("/api/storage/purge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ simulacion }),
      });
      const data = await response.json().catch(() => null) as PurgeReport & { message?: unknown } | null;
      if (!response.ok || !data || typeof data.deleted !== "number") {
        throw new Error(data && typeof data.message === "string" ? data.message : "No se pudieron limpiar los archivos.");
      }
      setPurge(data);
    } catch (caught) {
      setPurgeError(caught instanceof Error ? caught.message : "No se pudieron limpiar los archivos.");
    } finally {
      setWorking(null);
    }
  }

  /**
   * Revisa una página del inventario de R2. Solo lectura: no borra nada.
   * @param cursor - Cursor opaco de la página siguiente, si la hay.
   */
  async function loadInventory(cursor?: string) {
    setInventoryWorking(true);
    setInventoryError("");
    try {
      const response = await fetch(cursor ? `/api/storage/inventory?cursor=${encodeURIComponent(cursor)}` : "/api/storage/inventory");
      const data = await response.json().catch(() => null) as InventoryPage & { message?: unknown } | null;
      if (!response.ok || !data || !Array.isArray(data.entries) || typeof data.truncated !== "boolean") {
        throw new Error(data && typeof data.message === "string" ? data.message : "No se pudo revisar el inventario.");
      }
      setInventoryEntries((previous) => cursor ? [...previous, ...data.entries] : data.entries);
      setInventory({ truncated: data.truncated, cursor: data.cursor });
    } catch (caught) {
      setInventoryError(caught instanceof Error ? caught.message : "No se pudo revisar el inventario.");
    } finally {
      setInventoryWorking(false);
    }
  }

  const inventario = {
    objetos: inventoryEntries.filter((entry) => entry.status !== "fila_sin_objeto").length,
    conFila: inventoryEntries.filter((entry) => entry.status === "con_fila").length,
    sinFila: inventoryEntries.filter((entry) => entry.status === "objeto_sin_fila").length,
    filasSinObjeto: inventoryEntries.filter((entry) => entry.status === "fila_sin_objeto").length,
    revisar: inventoryEntries.filter((entry) => entry.status === "clave_revisar").length,
  };

  return (
    <section className="settings-section" aria-labelledby="settings-storage-title">
      <div>
        <h2 id="settings-storage-title">Almacenamiento de archivos</h2>
        <p>D1 guarda las fichas de los archivos y R2 guarda las imágenes y documentos. Sites inyecta ambos bindings en el Worker.</p>
      </div>
      {error ? (
        <p role="alert" className="admin-error">{error}</p>
      ) : !status ? (
        <p>Comprobando almacenamiento…</p>
      ) : (
        <>
          <div className={`storage-status ${status.ok ? "ok" : "error"}`} role={status.ok ? "status" : "alert"}>
            <strong>{status.ok ? "Disponible" : "Revisar configuración"}</strong>
            <p>{status.ok
              ? `${status.uploads} archivos con metadatos. Las imágenes y documentos se pueden subir.`
              : "Las imágenes y documentos no se podrán subir ni mostrar hasta que R2 esté disponible."}</p>
            <ul>
              <li>Base de datos D1: {status.database ? "sí" : "no"}</li>
              <li>Binding BUCKET: {status.bucket ? "sí" : "no"}</li>
              <li>Bucket R2 accesible: {status.bucketReachable ? "sí" : "no"}</li>
              <li>Filas de archivos: {status.uploads === null ? "no se pudieron leer" : status.uploads}</li>
            </ul>
          </div>

          {status.uploadStats ? (
            <div className="storage-uploads">
              <h3>Subidas por origen y tamaño</h3>
              <p>La web ya reduce las imágenes antes de subirlas; esta medición separa lo que llega por MCP para decidir si hace falta un redimensionador en el servidor.</p>
              {status.uploadStats.rows.length ? (
                <ul>
                  {status.uploadStats.rows.map((row) => (
                    <li key={`${row.origin}-${row.purpose}`}>
                      <code>{row.origin}/{row.purpose}</code>: {plural(row.count, "archivo", "archivos")} · {peso(row.bytes)} en total · máximo {peso(row.maxBytes)} · ≥1 MB: {row.over1mb} · ≥2 MB: {row.over2mb}
                    </li>
                  ))}
                </ul>
              ) : <p>Todavía no hay archivos.</p>}
            </div>
          ) : null}

          <div className="storage-purge">
            <h3>Archivos sin uso</h3>
            <p>
              Un archivo se puede limpiar cuando ningún documento del proyecto lo referencia y han pasado 7 días desde su
              subida. La comprobación se repite antes de cada borrado. No hay limpieza programada.
            </p>
            <div className="storage-purge-actions">
              <button type="button" onClick={() => void runPurge(true)} disabled={working !== null}>
                {working === "simular" ? "Simulando…" : "Simular limpieza"}
              </button>
              <button type="button" onClick={() => void runPurge(false)} disabled={working !== null}>
                {working === "limpiar" ? "Limpiando…" : "Limpiar archivos"}
              </button>
            </div>
            {purgeError ? <p role="alert" className="admin-error">{purgeError}</p> : null}
            {purge ? (
              <div className="storage-purge-result" role="status">
                <p>
                  {purge.simulated
                    ? `Simulación: ${plural(purge.candidates, "archivo sin uso", "archivos sin uso")} en ${plural(purge.projects, "proyecto", "proyectos")} (${peso(purge.bytes)}).`
                    : `Limpieza: ${plural(purge.deleted, "archivo borrado", "archivos borrados")} (${peso(purge.bytes)}); ${plural(purge.skipped, "omitido", "omitidos")} por referencia nueva y ${purge.failed} con error.`}
                </p>
                {purge.hasMore ? <p>Quedan más archivos; vuelve a ejecutar la limpieza.</p> : null}
                {purge.problems.length ? (
                  <p>{plural(purge.problems.length, "proyecto", "proyectos")} con documentos ilegibles; no se tocaron.</p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="storage-inventory">
            <h3>Inventario de R2</h3>
            <p>
              Recorre el bucket por páginas de hasta 100 objetos y lo coteja con los metadatos. Es una revisión de solo
              lectura: no se borra ni se modifica ningún objeto ni fila. Los objetos sin fila y las claves fuera del
              formato requieren revisión manual; este panel no permite eliminarlos.
            </p>
            <div className="storage-inventory-actions">
              <button type="button" onClick={() => void loadInventory()} disabled={inventoryWorking}>
                {inventoryWorking && !inventory ? "Revisando…" : inventory ? "Revisar de nuevo" : "Revisar inventario"}
              </button>
              {inventory?.truncated && inventory.cursor ? (
                <button type="button" onClick={() => void loadInventory(inventory.cursor ?? undefined)} disabled={inventoryWorking}>
                  {inventoryWorking ? "Cargando…" : "Cargar más"}
                </button>
              ) : null}
            </div>
            {inventoryError ? <p role="alert" className="admin-error">{inventoryError}</p> : null}
            {inventory ? (
              <>
                <div className="storage-inventory-result" role="status">
                  <p>{`Objetos: ${inventario.objetos} · con fila: ${inventario.conFila} · sin fila: ${inventario.sinFila} · filas sin objeto: ${inventario.filasSinObjeto} · claves a revisar: ${inventario.revisar}`}</p>
                  {inventario.objetos === 0 ? (
                    <p>{inventario.filasSinObjeto
                      ? `El bucket no tiene objetos; ${plural(inventario.filasSinObjeto, "fila sin objeto", "filas sin objeto")} en los metadatos.`
                      : "El bucket no tiene objetos ni filas que revisar."}</p>
                  ) : null}
                  <p>{inventory.truncated ? "Hay más páginas; usa «Cargar más» hasta llegar al final." : "Fin del inventario: no quedan páginas."}</p>
                </div>
                {inventoryEntries.length ? (
                  <ul className="storage-inventory-list">
                    {inventoryEntries.map((entry) => (
                      <li key={entry.status === "fila_sin_objeto" ? `fila-${entry.id}` : `objeto-${entry.key}`}>
                        <span className={`storage-inventory-status ${entry.status}`}>{ESTADOS[entry.status]}</span>
                        <code>{entry.status === "fila_sin_objeto" ? entry.storageKey : entry.key}</code>
                        <small>{entry.status === "fila_sin_objeto" ? `Fila ${entry.id}` : `${peso(entry.size)} · ${fecha(entry.uploaded)}`}</small>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
