CREATE TABLE `oauth_access_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`client_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`salt` text NOT NULL,
	`scope` text DEFAULT '' NOT NULL,
	`resource` text DEFAULT '' NOT NULL,
	`expires_at` integer NOT NULL,
	`last_used_at` integer,
	`created_at` integer NOT NULL,
	`revoked_at` integer
);
--> statement-breakpoint
CREATE INDEX `oauth_access_tokens_user` ON `oauth_access_tokens` (`user_id`,`revoked_at`,`created_at`);--> statement-breakpoint
CREATE TABLE `oauth_authorization_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`user_id` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`redirect_uri` text NOT NULL,
	`code_challenge` text NOT NULL,
	`scope` text DEFAULT '' NOT NULL,
	`resource` text DEFAULT '' NOT NULL,
	`expires_at` integer NOT NULL,
	`consumed_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `oauth_authorization_codes_client` ON `oauth_authorization_codes` (`client_id`,`expires_at`);--> statement-breakpoint
CREATE TABLE `oauth_clients` (
	`client_id` text PRIMARY KEY NOT NULL,
	`client_secret_hash` text NOT NULL,
	`client_secret_salt` text NOT NULL,
	`client_name` text DEFAULT '' NOT NULL,
	`redirect_uris` text DEFAULT '[]' NOT NULL,
	`scopes` text DEFAULT 'mcp:read mcp:write' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `oauth_refresh_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`client_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`salt` text NOT NULL,
	`scope` text DEFAULT '' NOT NULL,
	`resource` text DEFAULT '' NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`revoked_at` integer
);
--> statement-breakpoint
CREATE INDEX `oauth_refresh_tokens_user` ON `oauth_refresh_tokens` (`user_id`,`revoked_at`,`created_at`);