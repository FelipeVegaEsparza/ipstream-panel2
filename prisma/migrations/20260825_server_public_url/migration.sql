-- Migration: URL pública por servidor de streaming

ALTER TABLE `streaming_servers` ADD COLUMN `publicUrl` VARCHAR(191) NULL;
