CREATE TABLE `log_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`logged_at` text NOT NULL,
	`rating` real,
	`review` text,
	`status` text DEFAULT 'done' NOT NULL,
	`is_private` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `media_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `log_entries_logged_idx` ON `log_entries` (`logged_at`);--> statement-breakpoint
CREATE INDEX `log_entries_item_idx` ON `log_entries` (`item_id`);--> statement-breakpoint
CREATE TABLE `media_items` (
	`id` text PRIMARY KEY NOT NULL,
	`media_type` text NOT NULL,
	`parent_id` text,
	`external_source` text NOT NULL,
	`external_id` text NOT NULL,
	`title` text NOT NULL,
	`year` integer,
	`creator` text,
	`cover_url` text,
	`metadata` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `media_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_items_external_idx` ON `media_items` (`external_source`,`external_id`,`media_type`);--> statement-breakpoint
CREATE INDEX `media_items_parent_idx` ON `media_items` (`parent_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `site_config` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
