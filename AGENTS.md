# Reglas de trabajo de Aula Kanban

## Repositorios y publicación

- El repositorio personal `jaminsmoke/aula-kanban` es el único destino de commits y pushes de este proyecto. Sincroniza siempre con `git push github main`.
- El único publicador en Sites es Codex de OpenAI. Cualquier otro agente se limita a commits y push al repositorio personal; no despliega, no publica ni aplica migraciones remotas.
- Un push a GitHub no publica en Sites. Distingue siempre «sincronizado en GitHub» de «publicado y verificado en Sites»; una tarea no está publicada hasta que Codex lo confirma.

## Publicación de Aula Kanban

Antes de cada publicación de código en Sites, verifica la versión de aplicación realmente publicada, ejecuta `npm run release:prepare -- --published-version X.Y.Z` con esa versión, y ejecuta los checks y el build sobre el resultado. Una versión local ya superior se conserva en los reintentos. No cambies automáticamente las cifras mayor ni menor. No incrementes la versión para comprobaciones locales ni para un intento de despliegue de una versión ya preparada. Sigue además el flujo y las restricciones de migraciones de la skill de Sites y el README.
