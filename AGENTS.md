# Reglas de trabajo de Aula Kanban

## Repositorios y publicación

- El repositorio personal `jaminsmoke/aula-kanban` es el único destino de commits y pushes de este proyecto. Los commits se acumulan en local durante el roadmap; el push se reserva para su cierre.
- El único publicador en Sites es Codex de OpenAI. Cualquier otro agente se limita a commits locales y al push de cierre al repositorio personal; no despliega, no publica ni aplica migraciones remotas.
- Un push a GitHub no publica en Sites. Distingue siempre «sincronizado en GitHub» de «publicado y verificado en Sites»; una tarea no está publicada hasta que Codex lo confirma.

## Roadmaps y fases

- Un roadmap se divide en las fases que necesite el trabajo, no en un número fijo: puede tener una sola fase o varias.
- Cada fase agrupa un bloque verificable con sus criterios de aceptación. No se añaden fases de relleno ni se fusionan bloques que se revisan y confirman por separado.

## Commits, push y CI

- Haz un commit local por fase o bloque verificado; no hace falta esperar al final para confirmar el trabajo.
- No hagas push por cada bloque ni para «probar» CI. Un push dispara workflows y consume cuota.
- Haz el push a `github main` solo cuando el roadmap esté completo, su resumen esté arriba de `docs/developing/changelog.md` y `docs/developing/roadmap.md` se haya reiniciado.
- Antes de ese push, ejecuta los checks y el build sobre el estado final; el push debe ser único y suficiente.
- Los cambios de política o documentación que deban quedar registrados en el remoto pueden publicarse una vez, siempre que no disparen CI (por ejemplo, `docs/**` o `AGENTS.md`).

## Publicación de Aula Kanban

Antes de cada publicación de código en Sites, verifica la versión de aplicación realmente publicada, ejecuta `npm run release:prepare -- --published-version X.Y.Z` con esa versión, y ejecuta los checks y el build sobre el resultado. Una versión local ya superior se conserva en los reintentos. No cambies automáticamente las cifras mayor ni menor. No incrementes la versión para comprobaciones locales ni para un intento de despliegue de una versión ya preparada. Sigue además el flujo y las restricciones de migraciones de la skill de Sites y el README.
