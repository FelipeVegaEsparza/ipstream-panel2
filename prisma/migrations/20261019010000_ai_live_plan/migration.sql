ALTER TABLE `plans`
  ADD COLUMN `aiLiveEnabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `aiMonthlyCharacters` INTEGER NOT NULL DEFAULT 0;

CREATE TABLE `ai_tts_usage` (
  `id` VARCHAR(191) NOT NULL,
  `clientId` VARCHAR(191) NOT NULL,
  `period` VARCHAR(191) NOT NULL,
  `characters` INTEGER NOT NULL DEFAULT 0,
  `requests` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `ai_tts_usage_clientId_period_key`(`clientId`, `period`),
  INDEX `ai_tts_usage_clientId_idx`(`clientId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ai_tts_usage`
  ADD CONSTRAINT `ai_tts_usage_clientId_fkey`
  FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
