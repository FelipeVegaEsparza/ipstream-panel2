-- Migration: email comunicaciones (plantillas + log de envíos Resend)

CREATE TABLE `email_templates` (
  `id` VARCHAR(191) NOT NULL,
  `key` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `subject` VARCHAR(191) NOT NULL,
  `htmlBody` TEXT NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `email_templates_key_key` (`key`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `email_logs` (
  `id` VARCHAR(191) NOT NULL,
  `clientId` VARCHAR(191) NULL,
  `to` VARCHAR(191) NOT NULL,
  `from` VARCHAR(191) NOT NULL,
  `subject` VARCHAR(191) NOT NULL,
  `templateKey` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'sent',
  `resendId` VARCHAR(191) NULL,
  `error` TEXT NULL,
  `openedAt` DATETIME(3) NULL,
  `clickedAt` DATETIME(3) NULL,
  `sentAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `email_logs_clientId_idx` (`clientId`),
  INDEX `email_logs_status_idx` (`status`),
  INDEX `email_logs_templateKey_idx` (`templateKey`),
  INDEX `email_logs_resendId_idx` (`resendId`),
  INDEX `email_logs_createdAt_idx` (`createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `email_logs_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `email_logs_templateKey_fkey` FOREIGN KEY (`templateKey`) REFERENCES `email_templates`(`key`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
