# Gestor de aplicaciones: prototipo

Este directorio contiene un prototipo local **todavía no apto para producción**. No lo instales en un VPS ni configures credenciales de producción todavía. Se exige `SPACE_MANAGER_EXPERIMENTAL=1` para arrancarlo y las pruebas usan un Docker simulado.

El protocolo en preparación usa `SPACE_MANAGER_URL` y `SPACE_MANAGER_TOKEN` solo en el servidor de Sites. El gestor escucha exclusivamente en `127.0.0.1`; deberá quedar protegido por HTTPS y controles de acceso antes de conectarlo. Cada copia tiene un solo proyecto Compose con nombre `aula-kanban-` y un identificador propio. La configuración local registra un catálogo fijo y las operaciones no aceptan comandos ni rutas desde la web. La desinstalación se limita a los servicios de la aplicación y conserva los volúmenes; no se ejecutan `down` ni `prune`.

Para aislarlo del daemon que usa el resto del VPS, el prototipo exige un usuario de sistema dedicado y fuerza el socket de Docker rootless de ese mismo usuario. No acepta ejecutarse como root ni hereda la dirección de otro daemon. Docker rootless es una capa adicional de aislamiento, no una cuota de disco ni una garantía frente al agotamiento de los recursos compartidos.

Existe una plantilla de AFFiNE en `affine/compose.yaml.example`: su estructura se ha validado con `docker compose config --quiet` en un VPS real sin iniciar contenedores. Esta comprobación no prueba el arranque, la red, el proxy ni la persistencia. El gestor evita iniciar instalaciones si quedan menos de 5 GiB libres y aplica una cuota por app sobre sus datos en `data/<app>`: `maxDataBytes` en el catálogo (10 GiB por defecto, 100 GiB de techo), comprobada antes de instalar; el estado (`GET /v1/apps`) expone `dataBytes` y `maxDataBytes`. La cuota frena instalaciones sobre datos ya crecientes, pero no el crecimiento en ejecución (eso requeriría cuotas del sistema de ficheros), y el gestor no realiza purgas.

También hay plantilla de Nodum en `nodum/compose.yaml.example` (con su `nodum/Caddyfile.example`), adaptada de su compose oficial y registrada en el catálogo del gestor (`nodum_web` como entrada). Nodum no publica imágenes oficiales de api/web: las hay que construir una vez a mano en el VPS con los Dockerfile del repo y el gestor las usa con `--no-build`. La plantilla aún no se ha validado con Docker real: falta comprobar `docker compose config` con el `.env` relleno y el arranque completo antes de usarla.

## Imágenes por digest

Las imágenes permitidas están fijadas por digest (`repo:tag@sha256:...`) en `allowedImages` de `manager.mjs` y en las plantillas `compose.yaml.example`. El gestor rechaza cualquier servicio cuya imagen no sea EXACTAMENTE la permitida (`unknown_image`) o no lleve digest (`unpinned_image`): así un re-etiquetado en el registro no puede colar código distinto al auditado. Para actualizar una imagen: resolver su digest actual (`docker buildx imagetools inspect --raw <repo:tag>` o `crane digest <repo:tag>`), sustituirlo en AMBOS ficheros y volver a desplegar el gestor.

Excepciones con digest de ceros (`sha256:000...0`), a rellenar en el VPS antes del primer despliegue en ambos ficheros:

- `nodum-api` / `nodum-web`: imágenes locales construidas en el VPS; su digest es el Id de la imagen construida (`docker inspect --format '{{.Id}}' nodum-api:prod`).
- `nodum_minio` (`quay.io/minio/minio`): Quay deniega pulls anónimos para este repo, así que hay que resolver el digest con sesión iniciada (`docker login quay.io` y después `docker buildx imagetools inspect quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z`). El propio `docker compose pull` en el VPS necesitará esa misma sesión.

Un digest de ceros no existe en ningún registro: mientras no se sustituya, el pull falla.

Pendiente antes de usarlo: revisión de seguridad y del acceso al daemon de Docker; configuración de proxy y TLS compatible con los servicios existentes; límites de recursos (CPU/RAM); tratamiento y recuperación de fallos; pruebas completas con Docker real, con varios roles y con un VPS de prueba. La configuración, copia de seguridad y primera cuenta de AFFiNE requieren sus propios pasos. La interfaz y la API de Aula también necesitan completar la integración y su validación.

Prueba aislada: `node --test vps-manager/manager.test.mjs`. Los tests no inician ni alteran contenedores.

Logs operativos: el gestor escribe JSON por stdout (una línea por evento, con `ts`, `event` y datos de la operación): `listening`, `operation_accepted`, `operation_done`, `operation_failed`, `status_failed` y `docker_command_failed` (con los primeros argumentos del comando docker, su código de salida y su stderr truncado, para que los errores de validación y de Docker sean visibles). Nunca se registran el token `SPACE_MANAGER_TOKEN` ni cabeceras `Authorization`.
