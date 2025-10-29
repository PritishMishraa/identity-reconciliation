CREATE TABLE `contacts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`phone_number` text,
	`email` text,
	`linked_id` integer,
	`link_precedence` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`linked_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action
);
