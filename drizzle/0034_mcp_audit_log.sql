CREATE TABLE `mcp_audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`via` text NOT NULL,
	`client_id` text,
	`tool_name` text NOT NULL,
	`project_id` text,
	`result_code` text NOT NULL,
	`duration_ms` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `mcp_audit_log_created` ON `mcp_audit_log` (`created_at`);
