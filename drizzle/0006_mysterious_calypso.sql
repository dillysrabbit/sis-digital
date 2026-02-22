CREATE TABLE `plan_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sisEntryId` int NOT NULL,
	`content` text NOT NULL,
	`versionNumber` int NOT NULL,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `plan_versions_id` PRIMARY KEY(`id`)
);
