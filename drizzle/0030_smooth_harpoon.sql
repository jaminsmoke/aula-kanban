-- El trigger del perfil referencia la tabla de cuentas anterior.
DROP TRIGGER IF EXISTS `administrator_profiles_prevent_orphan_delete`;--> statement-breakpoint
DROP TABLE `administrators`;--> statement-breakpoint
DROP TABLE `administrator_profiles`;--> statement-breakpoint
DROP TABLE `space_apps`;--> statement-breakpoint
DROP TABLE `transition_state`;
