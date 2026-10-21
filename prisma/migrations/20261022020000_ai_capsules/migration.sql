ALTER TABLE `info_capsules`
  ADD COLUMN `clientId` VARCHAR(191) NULL,
  ADD COLUMN `source` VARCHAR(20) NOT NULL DEFAULT 'admin',
  ADD INDEX `info_capsules_clientId_idx`(`clientId`),
  ADD CONSTRAINT `info_capsules_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
