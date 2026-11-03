-- Reseñas IA: banco por cliente y configuración por radio.
-- Migración aditiva: la función arranca apagada (aiReviewEveryTracks = 0).

ALTER TABLE `radio_streams`
  ADD COLUMN `aiReviewEveryTracks` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `aiReviewStyle` VARCHAR(40) NULL,
  ADD COLUMN `aiReviewAdminEnabled` BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE `ai_reviews` (
  `id` VARCHAR(191) NOT NULL,
  `clientId` VARCHAR(191) NOT NULL,
  `kind` VARCHAR(191) NOT NULL DEFAULT 'track',
  `artist` VARCHAR(300) NOT NULL,
  `title` VARCHAR(300) NOT NULL DEFAULT '',
  `artistKey` VARCHAR(191) NOT NULL,
  `titleKey` VARCHAR(191) NOT NULL DEFAULT '',
  `style` VARCHAR(40) NOT NULL,
  `text` TEXT NOT NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `ai_reviews_clientId_kind_artistKey_titleKey_style_key`(`clientId`, `kind`, `artistKey`, `titleKey`, `style`),
  INDEX `ai_reviews_clientId_active_idx`(`clientId`, `active`),
  INDEX `ai_reviews_clientId_artistKey_idx`(`clientId`, `artistKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ai_reviews`
  ADD CONSTRAINT `ai_reviews_clientId_fkey`
  FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
