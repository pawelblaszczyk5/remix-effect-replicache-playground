CREATE TABLE `cvr` (
	`entities` blob NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`last_mutation_ids` blob NOT NULL
);
--> statement-breakpoint
CREATE TABLE `replicache_client` (
	`client_group_id` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`last_mutation_id` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `replicache_client-group` (
	`cvr_version` integer NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `todo` (
	`created_at` integer NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`is_completed` integer NOT NULL,
	`is_private` integer NOT NULL,
	`text` text NOT NULL,
	`version` integer NOT NULL
);
