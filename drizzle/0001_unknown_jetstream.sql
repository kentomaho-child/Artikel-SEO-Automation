CREATE TABLE `daily_usage` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`client_ip` varchar(64) NOT NULL,
	`usage_date` varchar(10) NOT NULL,
	`article_count` int NOT NULL DEFAULT 0,
	`outline_count` int NOT NULL DEFAULT 0,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `daily_usage_id` PRIMARY KEY(`id`),
	CONSTRAINT `daily_usage_ip_date_idx` UNIQUE(`client_ip`,`usage_date`)
);
--> statement-breakpoint
CREATE TABLE `style_presets` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`target_audience` varchar(255) NOT NULL,
	`language_style` varchar(100) NOT NULL,
	`language` varchar(10) NOT NULL DEFAULT 'id',
	`pov` varchar(50) NOT NULL DEFAULT 'anda',
	`custom_instructions` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `style_presets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `articles` MODIFY COLUMN `content` longtext NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `articles` ADD `keyword` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `articles` ADD `secondary_keywords` text;--> statement-breakpoint
ALTER TABLE `articles` ADD `slug` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `articles` ADD `meta_description` varchar(320);--> statement-breakpoint
ALTER TABLE `articles` ADD `target_audience` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `articles` ADD `language_style` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `articles` ADD `language` varchar(10) DEFAULT 'id' NOT NULL;--> statement-breakpoint
ALTER TABLE `articles` ADD `pov` varchar(50) DEFAULT 'anda' NOT NULL;--> statement-breakpoint
ALTER TABLE `articles` ADD `custom_instructions` text;--> statement-breakpoint
ALTER TABLE `articles` ADD `target_word_count` int DEFAULT 1200 NOT NULL;--> statement-breakpoint
ALTER TABLE `articles` ADD `outline` longtext;--> statement-breakpoint
ALTER TABLE `articles` ADD `word_count` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `articles` ADD `seo_score` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `articles` ADD `seo_report` longtext;--> statement-breakpoint
ALTER TABLE `articles` ADD `status` varchar(32) DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `articles` ADD `error_message` text;