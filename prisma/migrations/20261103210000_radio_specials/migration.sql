-- Especiales: intro + temas + cierre intercalados en el AutoDJ.
CREATE TABLE `radio_specials` (
  `id` VARCHAR(191) NOT NULL,
  `clientId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(200) NOT NULL,
  `artist` VARCHAR(200) NULL,
  `description` TEXT NOT NULL,
  `introText` TEXT NOT NULL,
  `closingText` TEXT NOT NULL,
  `everyTracks` INTEGER NOT NULL DEFAULT 10,
  `startDate` VARCHAR(10) NULL,
  `endDate` VARCHAR(10) NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `introReadyAt` DATETIME(3) NULL,
  `closingReadyAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  INDEX `radio_specials_clientId_active_idx`(`clientId`, `active`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `radio_special_tracks` (
  `id` VARCHAR(191) NOT NULL,
  `specialId` VARCHAR(191) NOT NULL,
  `trackId` VARCHAR(191) NOT NULL,
  `order` INTEGER NOT NULL DEFAULT 0,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `radio_special_tracks_specialId_trackId_key`(`specialId`, `trackId`),
  INDEX `radio_special_tracks_specialId_order_idx`(`specialId`, `order`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `radio_specials`
  ADD CONSTRAINT `radio_specials_clientId_fkey`
  FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `radio_special_tracks`
  ADD CONSTRAINT `radio_special_tracks_specialId_fkey`
  FOREIGN KEY (`specialId`) REFERENCES `radio_specials`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `radio_special_tracks`
  ADD CONSTRAINT `radio_special_tracks_trackId_fkey`
  FOREIGN KEY (`trackId`) REFERENCES `tracks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
