-- Create folders table
CREATE TABLE IF NOT EXISTS `folders` (
  `id` VARCHAR(191) NOT NULL,
  `clientId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(200) NOT NULL,
  `parentId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `folders_clientId_parentId_name_key` (`clientId`, `parentId`, `name`),
  INDEX `folders_clientId_idx` (`clientId`),
  INDEX `folders_parentId_idx` (`parentId`),
  CONSTRAINT `folders_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `folders_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `folders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add folderId column to tracks
ALTER TABLE `tracks` ADD COLUMN IF NOT EXISTS `folderId` VARCHAR(191) NULL,
  ADD INDEX `tracks_folderId_idx` (`folderId`),
  ADD CONSTRAINT `tracks_folderId_fkey` FOREIGN KEY (`folderId`) REFERENCES `folders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
