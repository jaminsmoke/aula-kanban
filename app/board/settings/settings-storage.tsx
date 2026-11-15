"use client";

import { useEffect, useState } from "react";

type StorageStatus = {
  database: boolean;
  bucket: boolean;
  bucketReachable: boolean;
  uploads: number | null;
  ok: boolean;
};

/**
 * Estado del almacenamiento de archivos para propietario y administración.
 * @returns El panel de diagnóstico de D1 y R2.
 */
export default function SettingsStorage() {
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [error, setError] = useState("");

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

  return (
    <section className="settings-section storage-section" aria-labelledby="settings-storage-title">
      <div>
        <h2 id="settings-storage-title">Almacenamiento de archivos</h2>
        <p>D1 guarda las fichas de los archivos y R2 guarda las imágenes y documentos. Sites inyecta ambos bindings en el Worker.</p>
      </div>
      {error ? (
        <p role="alert" className="admin-error">{error}</p>
      ) : !status ? (
        <p>Comprobando almacenamiento…</p>
      ) : (
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
      )}
    </section>
  );
}
