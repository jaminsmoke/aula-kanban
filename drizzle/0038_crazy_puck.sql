CREATE TABLE `project_books` (
	`project_id` text NOT NULL,
	`book_id` text NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`project_id`, `book_id`)
);
--> statement-breakpoint
CREATE INDEX `project_books_book` ON `project_books` (`book_id`);