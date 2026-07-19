-- AlterTable: add autoStart to radio_streams
ALTER TABLE `radio_streams` ADD COLUMN `autoStart` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: radio_djs
CREATE TABLE `radio_djs` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `mount` VARCHAR(10) NOT NULL,
    `priority` INT NOT NULL DEFAULT 1,
    `passwordEnc` TEXT NULL,
    `role` VARCHAR(10) NOT NULL DEFAULT 'guest',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `radio_djs_clientId_idx`(`clientId`),
    UNIQUE INDEX `radio_djs_clientId_mount_key`(`clientId`, `mount`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `radio_djs` ADD CONSTRAINT `radio_djs_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `radio_streams`(`clientId`) ON DELETE CASCADE ON UPDATE CASCADE;
