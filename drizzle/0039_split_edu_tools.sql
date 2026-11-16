-- Índice ya definido en el esquema; la transición de datos se realiza de forma acotada en el servicio.
CREATE UNIQUE INDEX IF NOT EXISTS `instance_app_app` ON `instance_apps` (`app_id`);
