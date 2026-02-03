CREATE TABLE `app_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`settingKey` varchar(100) NOT NULL,
	`settingValue` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `app_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sis_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`patientName` varchar(255) NOT NULL,
	`birthDate` varchar(20),
	`conversationDate` varchar(20),
	`nurseSignature` varchar(255),
	`relativeOrCaregiver` varchar(255),
	`oTon` text,
	`themenfeld1` text,
	`themenfeld2` text,
	`themenfeld3` text,
	`themenfeld4` text,
	`themenfeld5` text,
	`themenfeld6` text,
	`riskMatrix` json,
	`massnahmenplan` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sis_entries_id` PRIMARY KEY(`id`)
);
