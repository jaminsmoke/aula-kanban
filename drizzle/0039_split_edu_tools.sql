-- APP-02 fase 3: separa la instalación y las preferencias de edu-tools.
-- Es idempotente: si los ids nuevos ya existen, INSERT OR IGNORE conserva
-- su estado; la fila antigua se retira siempre.
INSERT OR IGNORE INTO `instance_apps` (`id`, `app_id`, `installed`, `version`, `installed_by_user_id`, `updated_at`)
SELECT 'calculadora-' || `id`, 'calculadora', 1, `version`, `installed_by_user_id`, `updated_at`
FROM `instance_apps`
WHERE `app_id` = 'edu-tools' AND `installed` = 1;
--> statement-breakpoint
INSERT OR IGNORE INTO `instance_apps` (`id`, `app_id`, `installed`, `version`, `installed_by_user_id`, `updated_at`)
SELECT 'tabla-periodica-' || `id`, 'tabla-periodica', 1, `version`, `installed_by_user_id`, `updated_at`
FROM `instance_apps`
WHERE `app_id` = 'edu-tools' AND `installed` = 1;
--> statement-breakpoint
INSERT OR IGNORE INTO `app_preferences` (`project_id`, `user_id`, `app_id`, `favorite`, `position`, `updated_at`)
SELECT `project_id`, `user_id`, 'calculadora', `favorite`, `position`, `updated_at`
FROM `app_preferences`
WHERE `app_id` = 'edu-tools';
--> statement-breakpoint
INSERT OR IGNORE INTO `app_preferences` (`project_id`, `user_id`, `app_id`, `favorite`, `position`, `updated_at`)
SELECT `project_id`, `user_id`, 'tabla-periodica', `favorite`, `position`, `updated_at`
FROM `app_preferences`
WHERE `app_id` = 'edu-tools';
--> statement-breakpoint
DELETE FROM `app_preferences` WHERE `app_id` = 'edu-tools';
--> statement-breakpoint
DELETE FROM `instance_apps` WHERE `app_id` = 'edu-tools';
