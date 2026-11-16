# Roadmap PROMO-07 · Preparar la demo para producción

> **Estado:** Activo
> **Inicio:** 2026-11-16
> **Entrada:** revisión previa al despliegue — el proyecto fijo de demo no existe en la D1 publicada, `/demo` responde con una página de indisponibilidad cuando falta y `scripts/seed-demo.mjs` solo acepta `localhost`/`127.0.0.1`, así que no puede preparar la instancia publicada.
> **Dependencias:** PROMO-05 completada (demo de solo lectura), PROMO-03 completada (datos ficticios y seed local).
> **Backlog:** PROMO-01 pausado; no quedan más entradas.
> **Changelog:** [`changelog.md`](changelog.md)

---

## 1. Objetivo

- [ ] Diseñar e implementar una preparación de la demo aislada, idempotente y autorizada para la instancia publicada y sus copias, sin tocar proyectos reales ni instalaciones globales como efecto secundario.
- [ ] Criterio de éxito: la demo funciona de extremo a extremo sin sesión en la instancia preparada; todas las escrituras siguen devolviendo 403; los proyectos y cuentas reales no cambian; si la demo no está preparada, la portada no ofrece un enlace roto; la publicación y la ejecución remota las hace Codex.

## 2. Alcance

**Dentro:**
- Revisar el hallazgo y corregir sus matices: `/demo` devuelve una página 404 con la orden de siembra, no un 503; el problema real es que esa orden no puede ejecutarse en remoto.
- Separar los datos ficticios de la demo del script local para compartirlos entre el seed local y un generador de SQL idempotente.
- Generar un SQL de datos (`demo-seed.sql` o equivalente) con ids fijos y `INSERT ... ON CONFLICT DO UPDATE`, limitado al proyecto demo y sin escribir en `instance_apps`.
- Ocultar «Probar la demo» en la portada cuando el proyecto demo no exista, para que una instancia sin preparar no publique un enlace roto.
- Documentar el procedimiento autorizado: copia/backup, revisión del SQL, ejecución por Codex en la D1 publicada y verificación posterior.
- Probar el SQL en una D1 local limpia y repetirlo para comprobar que no duplica ni pisa otros proyectos.

**Fuera de alcance:**
- Publicar en Sites, aplicar SQL o migraciones en remoto y verificar la versión publicada: lo hace Codex, como marca `AGENTS.md`.
- Instalar o desinstalar apps de la instancia como parte de la siembra: `instance_apps` es global y la decisión es del propietario en Aula Store.
- Cambiar el modelo de datos, los permisos o la demo de solo lectura.
- Sembrar datos reales o copiar datos de una instancia a otra.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| **SQL de datos generado y revisado** | Endpoint público protegido por un secreto | No añade superficie HTTP nueva en producción; Codex puede revisar el archivo y aplicarlo con la D1, que es el canal autorizado para escrituras remotas. |
| **Datos ficticios en un módulo compartido** | Duplicar los datos entre el seed local y el SQL | Evita que la demo local y la publicada diverjan; el seed local y el generador consumen la misma fuente. |
| **Upserts por ids fijos, sin borrar** | Borrar y recrear el proyecto demo | La segunda ejecución no duplica ni pierde referencias; nunca toca otros proyectos. |
| **Sin escrituras en `instance_apps`** | Instalar las cinco apps desde el seed | La instalación es de toda la instancia y la decide el propietario; la demo debe funcionar con las apps que ya haya. |
| **Ocultar el enlace si falta la demo** | Publicar el enlace y dejar el 404 | Una portada pública no debe prometer una demo que la instancia no tiene. |
| **Ejecución remota solo por Codex** | Script con `--remote` abierto a cualquier agente | `AGENTS.md` reserva la publicación, las migraciones remotas y la verificación a Codex. |
| **Copia/backup antes de aplicar** | Aplicar directamente sobre la D1 publicada | Permite revertir si el SQL o los datos no son los esperados. |

## 4. Fases

### Fase 1: Datos compartidos y SQL idempotente — completada (2026-11-16)
- [x] Extraer los datos ficticios de `scripts/seed-demo.mjs` a un módulo compartido (`lib/domain/demo-data.ts` o equivalente) con ids fijos para proyecto, alumnos, profesores, tareas, asignaciones, pizarra y documentos.
- [x] Añadir un generador (`npm run seed:demo:sql` o `node scripts/seed-demo-sql.mjs`) que escriba un SQL de datos idempotente, limitado al proyecto demo y sin `instance_apps`.
- [x] Aplicar el SQL en una D1 local limpia, repetirlo y comprobar que los recuentos no cambian y que un proyecto ajeno permanece intacto.
- [x] Mantener `npm run seed:demo` local funcionando con la misma fuente de datos.
- **Criterios de aceptación:** el SQL se puede revisar y aplicar dos veces sin duplicar; no escribe en `instance_apps` ni en otros proyectos; el seed local sigue pasando su verificación.
- **Verificación:** `lib/domain/demo-data.ts` centraliza los datos con ids fijos y `scripts/seed-demo.mjs` los importa; `npm run seed:demo -- --dry-run` sigue respondiendo «sin cambios». `lib/domain/demo-sql.ts` y `scripts/seed-demo-sql.mjs` generan un SQL de 99 líneas con upserts por id, borrado acotado de asignaciones del proyecto demo y sin `INSERT INTO instance_apps`. Sobre una D1 limpia con migraciones y un proyecto ajeno `3333…`, el SQL se aplicó dos veces: quedaron 6 alumnos, 2 profesores, 8 tareas, 15 asignaciones, 1 pizarra y 2 documentos, `instance_apps` siguió vacío y el proyecto ajeno conservó su nombre. 7 pruebas nuevas; suite completa **158 archivos / 1.156 pruebas**, `tsc` y ESLint correctos.

### Fase 2: Experiencia sin demo y procedimiento autorizado
- [ ] Hacer que la portada compruebe si el proyecto demo existe y oculte «Probar la demo» cuando falte; `/demo` conserva su página 404 con la explicación.
- [ ] Documentar en README el procedimiento para una instancia publicada: backup, revisión del SQL, ejecución por Codex, verificación sin sesión y qué hacer si la demo no está preparada.
- [ ] Añadir pruebas del estado de la portada con y sin proyecto demo, y del SQL generado (contenido, alcance e idempotencia).
- **Criterios de aceptación:** sin demo, la portada no muestra un enlace roto; con demo, el enlace aparece; el procedimiento deja claro que la ejecución remota es de Codex y que no se tocan apps globales.

### Fase 3: Verificación previa y entrega a Codex
- [ ] Pasar suite completa, `tsc`, ESLint, build y `perf:budget`; revisar la portada y `/demo` a 1366, 1024 y 390 px.
- [ ] Entregar a Codex el SQL revisado y la checklist: backup, aplicación, demo sin sesión, escrituras 403, proyectos reales intactos, apps sin cambios y versión publicada.
- [ ] Actualizar README, ayuda, changelog y archivar este roadmap; la publicación y la verificación en Sites quedan a cargo de Codex.
- **Criterios de aceptación:** la preparación está probada en local y revisada; la checklist no deja escrituras globales ni proyectos reales al azar; el roadmap no se declara publicado hasta que Codex lo confirme.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Un agente ejecuta el SQL en remoto sin autorización | Datos ficticios en una instancia real o cambios no revisados | El SQL se entrega a Codex; ningún script local acepta un host remoto. |
| El SQL toca `instance_apps` | Cambia las apps de toda la instancia | Excluirlo del generador y comprobarlo en las pruebas. |
| El SQL pisa proyectos reales | Pérdida o mezcla de datos | Ids fijos, `WHERE`/valores limitados al proyecto demo y prueba con un proyecto ajeno. |
| La segunda ejecución duplica tareas o fichas | Demo inconsistente | Upserts por ids fijos y prueba de idempotencia. |
| La demo publicada queda sin apps | Experiencia incompleta | El propietario instala las apps en Aula Store antes de publicar; la demo funciona con las que haya. |
| El enlace de la portada apunta a una demo inexistente | 404 en la portada pública | Ocultar el botón si el proyecto no existe y probarlo. |
| El SQL se aplica sin copia | Sin vuelta atrás | Backup previo y revisión del archivo antes de ejecutar. |
| Codex publica sin verificar la demo | Enlace roto o datos mezclados | Checklist de verificación sin sesión, escrituras 403 y versión publicada. |

## 6. Notas de sesión

- 2026-11-16: PROMO-07 sale del backlog y pasa a ser el roadmap activo; el backlog queda solo con PROMO-01 pausado.
- 2026-11-16: la revisión previa al despliegue confirmó que `scripts/seed-demo.mjs` rechaza cualquier host que no sea `localhost`/`127.0.0.1` y que `/demo` devuelve una página 404 con la orden de siembra cuando falta el proyecto; no es un 503.
- 2026-11-16: `instance_apps` es de alcance de instancia; la siembra local instala las cinco apps, pero esa decisión no debe trasladarse a producción como efecto secundario.
- 2026-11-16: la verificación local previa ya dejó lint, tipos, 1.149 pruebas y build correctos; producción sigue en `1.1.32` y el deploy está pendiente.
- 2026-11-16: la publicación, la ejecución remota del SQL y la verificación en Sites corresponden a Codex; este roadmap prepara y revisa el material, no lo despliega.
