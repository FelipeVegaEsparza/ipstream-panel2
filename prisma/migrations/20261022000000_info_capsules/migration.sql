CREATE TABLE `info_capsule_categories` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `info_capsule_categories_name_key`(`name`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `info_capsules` (
  `id` VARCHAR(191) NOT NULL,
  `categoryId` VARCHAR(191) NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `fileName` VARCHAR(191) NOT NULL,
  `mimeType` VARCHAR(100) NOT NULL,
  `url` VARCHAR(500) NOT NULL,
  `size` INTEGER NOT NULL,
  `duration` INTEGER NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `info_capsules_categoryId_idx`(`categoryId`),
  INDEX `info_capsules_active_idx`(`active`),
  PRIMARY KEY (`id`),
  CONSTRAINT `info_capsules_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `info_capsule_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `client_info_capsules` (
  `id` VARCHAR(191) NOT NULL,
  `clientId` VARCHAR(191) NOT NULL,
  `capsuleId` VARCHAR(191) NOT NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `client_info_capsules_clientId_capsuleId_key`(`clientId`, `capsuleId`),
  INDEX `client_info_capsules_clientId_sortOrder_idx`(`clientId`, `sortOrder`),
  PRIMARY KEY (`id`),
  CONSTRAINT `client_info_capsules_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `client_info_capsules_capsuleId_fkey` FOREIGN KEY (`capsuleId`) REFERENCES `info_capsules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `tracks`
  ADD COLUMN `capsuleId` VARCHAR(191) NULL,
  ADD INDEX `tracks_capsuleId_idx`(`capsuleId`),
  ADD CONSTRAINT `tracks_capsuleId_fkey` FOREIGN KEY (`capsuleId`) REFERENCES `info_capsules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
