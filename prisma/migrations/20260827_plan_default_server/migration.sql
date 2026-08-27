-- Migration: servidor por defecto del plan

ALTER TABLE `plans` ADD COLUMN `defaultServerId` VARCHAR(191) NULL;
CREATE INDEX `plans_defaultServerId_idx` ON `plans`(`defaultServerId`);
ALTER TABLE `plans` ADD CONSTRAINT `plans_defaultServerId_fkey` FOREIGN KEY (`defaultServerId`) REFERENCES `streaming_servers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
