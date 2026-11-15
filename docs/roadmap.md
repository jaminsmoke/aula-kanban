# Roadmap UI-03 · Secciones de Ajustes

> **Estado:** Completado · **Backlog:** [`backlog.md`](backlog.md) · **Changelog:** [`changelog.md`](changelog.md)
> **Origen:** entrada UI-03 del backlog (2026-11-15).

---

## 1. Objetivo

- [x] Reorganizar Ajustes en secciones con una sola responsabilidad cada una.
- [x] Conservar las URLs existentes y permitir enlaces directos a las secciones nuevas.
- **Criterio de éxito:** cada sección agrupa un tema, los permisos ocultan lo restringido sin romper enlaces y atrás/adelante sigue funcionando.

## 2. Alcance

**Dentro:**
- Separar `Cuenta`, `Apariencia`, `Tokens MCP`, `Administradores` y `Almacenamiento`.
- Extender el esquema `section` de Ajustes y mantener `cuenta`, `apariencia` y `administradores` como URLs válidas.
- Revisar la navegación móvil del sidebar y el estado activo.
- Actualizar las pruebas de URL, vista, permisos y enlaces MCP.
- Actualizar la ayuda, el README y el snapshot del catálogo MCP si cambia el esquema de `obtener_enlace`.

**Fuera de alcance:**
- Añadir una sección de Auditoría: no existe todavía una vista que la respalde.
- Cambiar las API de tokens, administradores o almacenamiento.
- Añadir migraciones de base de datos.
- Rediseñar el layout de Ajustes o cambiar sus tokens visuales.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Tokens MCP es una sección propia | Dejarlo dentro de Cuenta | Cuenta deja de mezclar identidad, sesión y credenciales. |
| Almacenamiento es una sección propia | Dejarlo dentro de Administradores | El diagnóstico operativo no comparte responsabilidad con las fichas de administración. |
| Conservar los ids actuales y añadir `tokens` y `almacenamiento` | Redirigir desde una URL nueva | Los enlaces guardados siguen funcionando y no hace falta una capa de redirección. |
| Secciones restringidas ocultas y fallback a Cuenta | Mostrarlas deshabilitadas | No se revelan funciones que la cuenta no puede usar. |
| Sin sección de Auditoría en esta fase | Incluirla ahora | No hay componente ni fuente de datos preparada; sería una función nueva. |

## 4. Fases

### Fase 1: Esquema y URLs

- [x] Ampliar `SettingsSection` con `tokens` y `almacenamiento`.
- [x] Añadir una lista canónica de secciones reutilizable por el parser y el MCP.
- [x] Resolver valores inválidos a `cuenta` y conservar `project`, `view` y parámetros desconocidos.
- [x] Actualizar el esquema de `obtener_enlace` y la versión del catálogo MCP.
- **Criterios de aceptación:** las URLs antiguas siguen abriendo la misma sección; las nuevas se parsean y se construyen; los tests de roundtrip pasan.

### Fase 2: Composición y permisos

- [x] Sacar los tokens de `SettingsAccount`.
- [x] Sacar el almacenamiento de la sección de administradores.
- [x] Renderizar cada sección con su propio componente y título.
- [x] Añadir Tokens MCP para todas las cuentas; Administradores y Almacenamiento solo para propietario o administración.
- [x] Si una cuenta sin permiso abre una sección restringida, mostrar Cuenta y canonicalizar la URL.
- [x] Revisar el sidebar móvil para que cinco secciones se puedan desplazar sin desbordar.
- **Criterios de aceptación:** no se duplica lógica; no se muestran secciones restringidas; la sección activa coincide con el contenido.

### Fase 3: Documentación y verificación

- [x] Actualizar la ayuda de enlaces y las referencias a Tokens MCP.
- [x] Actualizar el README y el estado de la documentación.
- [x] Actualizar el snapshot de `tools/list` y las pruebas de matriz/paridad afectadas.
- [x] Ejecutar lint, tipos, tests, build y `git diff --check`.
- **Criterios de aceptación:** suite completa en verde, sin migraciones nuevas y con el snapshot sincronizado.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Enlaces antiguos a Administradores esperaban ver también Almacenamiento | Cambio de contenido percibido | Mantener el id y documentar la nueva sección; no romper la URL. |
| Un fallback silencioso deja una URL restringida en la barra | Enlaces compartidos engañosos | Canonicalizar a `section=cuenta` cuando falte permiso. |
| El enum de `obtener_enlace` se queda atrás | El MCP no puede enlazar las secciones nuevas | Derivarlo de la lista canónica y actualizar snapshot/versión. |
| Cinco botones desbordan el sidebar móvil | Navegación incómoda | `min-width:0`, scroll horizontal y título sin encoger. |

## 6. Notas de sesión

- 2026-11-15: roadmap abierto desde UI-03; MCP-05 se mantiene en el backlog porque su alcance aún se está pensando.
- 2026-11-15: fases 1-3 completadas; suite completa, lint, tipos y build correctos. Sin inspección visual en navegador.
