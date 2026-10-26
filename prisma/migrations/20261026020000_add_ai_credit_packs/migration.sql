-- CreateTable
CREATE TABLE `ai_credit_packs` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `creditType` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `price` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'CLP',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ai_credit_packs_isActive_order_idx` (`isActive`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_credit_requests` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `packId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `creditType` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `price` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL,
    `note` TEXT NULL,
    `paymentId` VARCHAR(191) NULL,
    `resolvedBy` VARCHAR(191) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ai_credit_requests_clientId_status_idx` (`clientId`, `status`),
    INDEX `ai_credit_requests_status_createdAt_idx` (`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_credit_grants` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `packId` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NULL,
    `source` VARCHAR(191) NOT NULL,
    `characters` INTEGER NOT NULL DEFAULT 0,
    `musicSeconds` INTEGER NOT NULL DEFAULT 0,
    `remainingCharacters` INTEGER NOT NULL DEFAULT 0,
    `remainingMusicSeconds` INTEGER NOT NULL DEFAULT 0,
    `paymentId` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ai_credit_grants_requestId_key` (`requestId`),
    INDEX `ai_credit_grants_clientId_createdAt_idx` (`clientId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ai_credit_requests` ADD CONSTRAINT `ai_credit_requests_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_credit_requests` ADD CONSTRAINT `ai_credit_requests_packId_fkey` FOREIGN KEY (`packId`) REFERENCES `ai_credit_packs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_credit_grants` ADD CONSTRAINT `ai_credit_grants_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_credit_grants` ADD CONSTRAINT `ai_credit_grants_packId_fkey` FOREIGN KEY (`packId`) REFERENCES `ai_credit_packs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_credit_grants` ADD CONSTRAINT `ai_credit_grants_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `ai_credit_requests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
