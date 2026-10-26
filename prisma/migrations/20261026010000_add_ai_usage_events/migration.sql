-- CreateTable
CREATE TABLE `ai_usage_events` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `period` VARCHAR(191) NOT NULL,
    `feature` VARCHAR(191) NOT NULL,
    `characters` INTEGER NOT NULL DEFAULT 0,
    `musicSeconds` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_usage_events_clientId_period_idx` (`clientId`, `period`),
    INDEX `ai_usage_events_period_feature_idx` (`period`, `feature`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ai_usage_events` ADD CONSTRAINT `ai_usage_events_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
