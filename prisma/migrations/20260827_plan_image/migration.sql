-- Migration: imagen del plan

ALTER TABLE `plans` ADD COLUMN `imageUrl` VARCHAR(191) NULL;
