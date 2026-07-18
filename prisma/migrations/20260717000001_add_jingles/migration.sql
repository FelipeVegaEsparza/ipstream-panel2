-- AlterTable: add jingle config to radio_streams
ALTER TABLE `radio_streams` ADD COLUMN `jinglePlayEvery` INT NOT NULL DEFAULT 5;
ALTER TABLE `radio_streams` ADD COLUMN `jinglePlayCount` INT NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE `jingles` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `radioStreamId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `artist` VARCHAR(191) NULL,
    `duration` DOUBLE NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `filePath` VARCHAR(191) NOT NULL,
    `fileSize` INT NOT NULL,
    `coverUrl` VARCHAR(191) NULL,
    `mimeType` VARCHAR(191) NOT NULL DEFAULT 'audio/mpeg',
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `jingles_clientId_idx`(`clientId`),
    INDEX `jingles_radioStreamId_idx`(`radioStreamId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `jingles` ADD CONSTRAINT `jingles_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jingles` ADD CONSTRAINT `jingles_radioStreamId_fkey` FOREIGN KEY (`radioStreamId`) REFERENCES `radio_streams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
