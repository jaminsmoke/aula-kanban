# Documentación de Aula Kanban

Índice y guía del trabajo del proyecto. La documentación de producto y la de planificación viven juntas aquí.

## Documentos

| Documento | Para qué | Orden |
|---|---|---|
| [`roadmap.md`](roadmap.md) | Solo la fase activa: objetivo, alcance, fases, riesgos y notas | Secuencia de ejecución |
| [`backlog.md`](backlog.md) | Trabajo aparcado o pendiente de priorizar | Lo nuevo arriba |
| [`changelog.md`](changelog.md) | Hitos completados y versiones publicadas | Lo nuevo arriba |
| [`aplicaciones-nativas.md`](aplicaciones-nativas.md) | Catálogo de apps nativas, licencias y estado | Temático |
| [`roadmap-template.md`](roadmap-template.md) | Plantilla para reiniciar el roadmap | — |
| [`backlog-template.md`](backlog-template.md) | Plantilla para reiniciar el backlog | — |
| [`changelog-template.md`](changelog-template.md) | Plantilla para reiniciar el changelog | — |

## Arquitectura

Dirección de dependencias:

```text
app  →  lib  →  db
```

- `app/` contiene páginas, componentes y rutas HTTP.
- `lib/domain/` contiene tipos y funciones puras compartidas por cliente y servidor.
- `lib/server/` contiene autenticación y acceso server-side.
- `db/` contiene el esquema y la conexión a D1.
- `lib/` **no puede importar desde `app/`**. La regla `no-restricted-imports` de ESLint lo bloquea.

## Tokens CSS

La fuente única es `app/globals.css`. Los tokens se agrupan por intención:

- **Superficies y texto:** `--canvas`, `--white`, `--ink`, `--ink-soft`, `--ink-deep`, `--muted`, `--line`, `--line-strong`, `--line-subtle`, `--line-control`, `--line-soft`, `--line-violet`, `--surface-muted`, `--surface-hover`, `--surface-sunken`, `--surface-tint`, `--surface-faint`, `--surface-pale`.
- **Marca y foco:** `--violet`, `--violet-dark`, `--violet-pale`, `--violet-bright`, `--focus`, `--focus-on-dark`.
- **Estados:** `--danger`, `--danger-ink`, `--danger-soft`, `--danger-deep`, `--success`, `--success-soft`, `--warning-ink`, `--warning-soft`, `--warning-pale`, `--warning-deep`, `--info-ink`, `--info-soft`.
- **Forma:** `--radius`, `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-pill`.
- **Tipografía:** `--font-body`, `--font-display`.

Regla: un token debe representar un patrón compartido o una intención; no se tokeniza cada valor aislado, cada sombra ni cada tamaño de letra.

### CSS compartido y CSS específico

- `globals.css` contiene los tokens, la base, las animaciones y las reglas compartidas por más de un componente o usadas más de una vez.
- Cada feature mantiene su CSS junto al código y solo incluye las especificidades que usa una vez.
- Si un valor o selector empieza a repetirse en otro componente, o se repite dos veces en el mismo, se promociona a token o regla compartida en `globals.css`.
- `globals.css` no se elimina ni se carga desde una vista lazy. Los estilos compartidos de `layout.tsx` (`buttons`, `access`, `dialogs`) tampoco se mueven a una vista lazy.

## Flujo de trabajo

1. **Entra una idea o una revisión.** Si se va a hacer ahora, se convierte en la fase activa de `roadmap.md`. Si se aparca, se añade arriba de `backlog.md`.
2. **Se ejecuta el roadmap.** El roadmap contiene solo la fase activa y sus subfases; no es una lista de deseos.
3. **Se cierra el roadmap.** Solo cuando **todas** sus fases están completadas, incluida la verificación final, su resumen pasa arriba de `changelog.md` y `roadmap.md` se reinicia desde `roadmap-template.md`.
4. **Lo aparcado no se pierde.** Permanece en `backlog.md` hasta que se convierte en roadmap o se descarta con una nota.
5. **Las plantillas no se usan para trabajo real.** Se copian para reiniciar un documento y se quedan limpias.

## Reglas de orden

- **Changelog y backlog:** lo más reciente va siempre arriba; lo más antiguo queda al final.
- El orden indica **recencia**, no prioridad.
- No se borran entradas antiguas del changelog; se añaden hitos nuevos encima.
- En el backlog, cada entrada debe explicar contexto, qué falta antes de retomarla y notas técnicas.

## Estado actual

- **Fase 1 completada:** reorganización de `app/board` por dominios, módulos compartidos y estilos.
- **Roadmap CSS completado:** tokens, CSS por feature, limpieza y verificación final. Resumen en [`changelog.md`](changelog.md); la auditoría temporal ya se eliminó.
- **Roadmap de dominio/auth completado:** `lib/domain/`, `lib/server/auth.ts`, regla de frontera y documentación. Resumen en [`changelog.md`](changelog.md).
- **Roadmap de guardas HTTP completado:** `lib/server/http.ts`, 12 rutas con `json`, mutaciones JSON con origen/formato y `uploads` con origen. Publicado en la versión 1.1.17; resumen en [`changelog.md`](changelog.md).
- **Roadmap de tareas completado:** `lib/server/tasks/` con tipos, consultas, permisos y mutaciones; ruta HTTP delgada. Resumen en [`changelog.md`](changelog.md).
- **Roadmap de componentes completado:** Aula Store, calculadora, Mermaid, diálogo de tarea, Blockly y Whiteboard divididos; verificación final correcta. Resumen en [`changelog.md`](changelog.md).
- **Roadmap de reintento de pizarra completado:** el error de carga se limpia cuando la pizarra vuelve a cargar; regresión de hook y vista añadida. Resumen en [`changelog.md`](changelog.md).
- **Roadmap de carga por pestañas de `edu-tools` completado:** tabla periódica, medición, lectura y ecuaciones se cargan bajo demanda; datos periódicos en JSON. Resumen en [`changelog.md`](changelog.md).
- **Versión:** 1.1.20. Los últimos hitos están en [`changelog.md`](changelog.md).
- **Roadmap de respuestas sin sesión completado:** contrato 401/403/404/400 aplicado a las 12 rutas y contrato del socket documentado. Resumen en [`changelog.md`](changelog.md).
- **Roadmap de propiedad completado:** identidad estable en `instance_owner`, migración `0028`, helper común y checklist de remix. Resumen en [`changelog.md`](changelog.md).
- **Roadmap de `compute-engine` completado:** motor mantenido, carga selectiva en Científica/Ecuaciones y estado de cálculo. Resumen en [`changelog.md`](changelog.md).
- **Roadmap de documentos completado:** Blockly y Mermaid usan `app_documents`; las dos tablas históricas se retiraron tras la auditoría y respaldo.
- **Roadmap activo:** detalles de rendimiento y acabado; fases 1 y 2 completadas.
- **Backlog pendiente:** sin entradas.
- **Próximo paso:** fase 3 del roadmap activo, fuentes, verificación final y cierre.

## Documentación relacionada

- [`../README.md`](../README.md): instalación, desarrollo, base de datos y migraciones.
- [`../AGENTS.md`](../AGENTS.md): reglas de publicación y trabajo del agente.
- [`../package.json`](../package.json): dependencias y scripts del proyecto.
