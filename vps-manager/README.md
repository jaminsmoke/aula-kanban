# Gestor de aplicaciones: prototipo

Este directorio contiene un prototipo local **todavía no apto para producción**. No lo instales en un VPS ni configures credenciales de producción todavía. Se exige `SPACE_MANAGER_EXPERIMENTAL=1` para arrancarlo y las pruebas usan un Docker simulado.

El protocolo en preparación usa `SPACE_MANAGER_URL` y `SPACE_MANAGER_TOKEN` solo en el servidor de Sites. El gestor escucha exclusivamente en `127.0.0.1`; deberá quedar protegido por HTTPS y controles de acceso antes de conectarlo. Cada copia tiene un solo proyecto Compose con nombre `aula-kanban-` y un identificador propio. La configuración local registra un catálogo fijo y las operaciones no aceptan comandos ni rutas desde la web. La desinstalación se limita a los servicios de la aplicación y conserva los volúmenes; no se ejecutan `down` ni `prune`.

Para aislarlo del daemon que usa el resto del VPS, el prototipo exige un usuario de sistema dedicado y fuerza el socket de Docker rootless de ese mismo usuario. No acepta ejecutarse como root ni hereda la dirección de otro daemon. Docker rootless es una capa adicional de aislamiento, no una cuota de disco ni una garantía frente al agotamiento de los recursos compartidos.

Existe una plantilla de AFFiNE en `affine/compose.yaml.example`: su estructura se ha validado con `docker compose config --quiet` en un VPS real sin iniciar contenedores. Esta comprobación no prueba el arranque, la red, el proxy ni la persistencia. El gestor evita iniciar instalaciones si quedan menos de 5 GiB libres, pero aún no impone cuotas de almacenamiento ni realiza purgas.

También hay plantilla de Nodum en `nodum/compose.yaml.example` (con su `nodum/Caddyfile.example`), adaptada de su compose oficial y registrada en el catálogo del gestor (`nodum_web` como entrada). Nodum no publica imágenes oficiales de api/web: las hay que construir una vez a mano en el VPS con los Dockerfile del repo y el gestor las usa con `--no-build`. La plantilla aún no se ha validado con Docker real: falta comprobar `docker compose config` con el `.env` relleno y el arranque completo antes de usarla.

Pendiente antes de usarlo: revisión de seguridad y del acceso al daemon de Docker; configuración de proxy y TLS compatible con los servicios existentes; gestión del espacio y límites de recursos; tratamiento y recuperación de fallos; pruebas completas con Docker real, con varios roles y con un VPS de prueba. La configuración, copia de seguridad y primera cuenta de AFFiNE requieren sus propios pasos. La interfaz y la API de Aula también necesitan completar la integración y su validación.

Prueba aislada: `node --test vps-manager/manager.test.mjs`. Los tests no inician ni alteran contenedores.
