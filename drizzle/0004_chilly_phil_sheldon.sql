CREATE TABLE `text_blocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`category` enum('themenfeld1','themenfeld2','themenfeld3','themenfeld4','themenfeld5','themenfeld6','oTon','allgemein') NOT NULL,
	`isDefault` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `text_blocks_id` PRIMARY KEY(`id`)
);
