-- CreateTable
CREATE TABLE `site_content` (
    `id` VARCHAR(191) NOT NULL,
    `locale` VARCHAR(16) NOT NULL,
    `content` JSON NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `site_content_locale_key` (`locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
