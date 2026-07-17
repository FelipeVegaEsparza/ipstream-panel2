-- CreateTable: polls
CREATE TABLE `polls` (
    `id` VARCHAR(30) NOT NULL,
    `clientId` VARCHAR(30) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`),
    INDEX `polls_clientId_idx` (`clientId`),
    CONSTRAINT `polls_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: poll_options
CREATE TABLE `poll_options` (
    `id` VARCHAR(30) NOT NULL,
    `pollId` VARCHAR(30) NOT NULL,
    `text` VARCHAR(191) NOT NULL,
    `votes` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`),
    INDEX `poll_options_pollId_idx` (`pollId`),
    CONSTRAINT `poll_options_pollId_fkey` FOREIGN KEY (`pollId`) REFERENCES `polls`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
