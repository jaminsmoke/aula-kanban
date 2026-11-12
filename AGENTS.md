# Publicación de Aula Kanban

Antes de cada publicación de código en Sites, verifica la versión de aplicación realmente publicada, ejecuta `npm run release:prepare -- --published-version X.Y.Z` con esa versión, y ejecuta los checks y el build sobre el resultado. Una versión local ya superior se conserva en los reintentos. No cambies automáticamente las cifras mayor ni menor. No incrementes la versión para comprobaciones locales ni para un intento de despliegue de una versión ya preparada. Sigue además el flujo y las restricciones de migraciones de la skill de Sites y el README.
