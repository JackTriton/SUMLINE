CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `results` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`user_id` text NOT NULL,
	`mode` text NOT NULL,
	`context` text NOT NULL,
	`stage` integer NOT NULL,
	`score` integer NOT NULL,
	`elapsed_ms` integer NOT NULL,
	`lives` integer NOT NULL,
	`accepted_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `results_session` ON `results` (`session_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `results_board` ON `results` (`user_id`,`mode`,`context`,`stage`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`mode` text NOT NULL,
	`context` text NOT NULL,
	`stage` integer NOT NULL,
	`first_key` text,
	`puzzle` text NOT NULL,
	`started_at` integer NOT NULL,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_first_key` ON `sessions` (`first_key`);--> statement-breakpoint
CREATE TABLE `tournaments` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`seed` text NOT NULL,
	`rows` integer NOT NULL,
	`cols` integer NOT NULL,
	`boards` integer NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
