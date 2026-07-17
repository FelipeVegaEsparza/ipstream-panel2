-- CreateTable: pwa_installs
CREATE TABLE `pwa_installs` (
    `id` VARCHAR(30) NOT NULL,
    `clientId` VARCHAR(30) NOT NULL,
    `deviceId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    INDEX `pwa_installs_clientId_idx` (`clientId`),
    UNIQUE INDEX `pwa_installs_clientId_deviceId_key` (`clientId`, `deviceId`),
    CONSTRAINT `pwa_installs_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
