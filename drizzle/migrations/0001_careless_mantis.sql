PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_contacts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`phone_number` text,
	`email` text,
	`linked_id` integer,
	`link_precedence` text DEFAULT 'primary' NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`linked_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_contacts`("id", "phone_number", "email", "linked_id", "link_precedence", "created_at", "updated_at", "deleted_at") SELECT "id", "phone_number", "email", "linked_id", "link_precedence", "created_at", "updated_at", "deleted_at" FROM `contacts`;--> statement-breakpoint
DROP TABLE `contacts`;--> statement-breakpoint
ALTER TABLE `__new_contacts` RENAME TO `contacts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `email_idx` ON `contacts` (`email`);--> statement-breakpoint
CREATE INDEX `phone_idx` ON `contacts` (`phone_number`);--> statement-breakpoint
CREATE INDEX `linked_id_idx` ON `contacts` (`linked_id`);--> statement-breakpoint
CREATE INDEX `email_phone_idx` ON `contacts` (`email`,`phone_number`);--> statement-breakpoint
CREATE INDEX `deleted_at_idx` ON `contacts` (`deleted_at`);