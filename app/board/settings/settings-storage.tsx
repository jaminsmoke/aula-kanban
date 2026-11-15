"use client";

import { useEffect, useState } from "react";

type StorageStatus = {
  database: boolean;
  bucket: boolean;
  bucketReachable: boolean;
  uploads: number | null;
  ok: boolean;
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
        </>
      )}
    </section>
  );
}
