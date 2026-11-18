-- Programa de referidos: tablas aditivas y columnas de crédito.
-- No modifica precios, suscripciones ni pagos existentes.

CREATE TABLE `referrals` (
  `id` VARCHAR(191) NOT NULL,
  `referrerClientId` VARCHAR(191) NOT NULL,
  `referredClientId` VARCHAR(191) NOT NULL,
  `code` VARCHAR(32) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'registered',
  `flagged` BOOLEAN NOT NULL DEFAULT false,
  `flagReason` VARCHAR(191) NULL,
  `signupIp` VARCHAR(64) NULL,
  `signupUserAgent` VARCHAR(500) NULL,
  `registeredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `firstPaidAt` DATETIME(3) NULL,
  `secondPaidAt` DATETIME(3) NULL,
  `validatedAt` DATETIME(3) NULL,
  `rejectedAt` DATETIME(3) NULL,
  `rejectionReason` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `referrals_referredClientId_key`(`referredClientId`),
  INDEX `referrals_referrerClientId_status_idx`(`referrerClientId`, `status`),
  INDEX `referrals_status_registeredAt_idx`(`status`, `registeredAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `referral_payments` (
  `id` VARCHAR(191) NOT NULL,
  `referralId` VARCHAR(191) NOT NULL,
  `paymentId` VARCHAR(191) NOT NULL,
  `role` VARCHAR(191) NOT NULL,
  `amount` DOUBLE NOT NULL,
  `currency` VARCHAR(191) NOT NULL,
  `paidAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE INDEX `referral_payments_paymentId_key`(`paymentId`),
  INDEX `referral_payments_referralId_role_idx`(`referralId`, `role`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `referral_rewards` (
  `id` VARCHAR(191) NOT NULL,
  `referrerClientId` VARCHAR(191) NOT NULL,
  `referralId` VARCHAR(191) NOT NULL,
  `slotIndex` INTEGER NOT NULL,
  `months` INTEGER NOT NULL DEFAULT 1,
  `amount` DOUBLE NOT NULL,
  `currency` VARCHAR(191) NOT NULL,
  `remainingAmount` DOUBLE NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'available',
  `priceSnapshot` JSON NOT NULL,
  `reviewRequired` BOOLEAN NOT NULL DEFAULT false,
  `generatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `appliedAt` DATETIME(3) NULL,
  `subscriptionId` VARCHAR(191) NULL,
  `voidedAt` DATETIME(3) NULL,
  `voidReason` TEXT NULL,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `referral_rewards_referrerClientId_slotIndex_key`(`referrerClientId`, `slotIndex`),
  INDEX `referral_rewards_referrerClientId_status_idx`(`referrerClientId`, `status`),
  INDEX `referral_rewards_referralId_idx`(`referralId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `referral_credit_ledger` (
  `id` VARCHAR(191) NOT NULL,
  `clientId` VARCHAR(191) NOT NULL,
  `rewardId` VARCHAR(191) NULL,
  `paymentId` VARCHAR(191) NULL,
  `type` VARCHAR(191) NOT NULL,
  `amount` DOUBLE NOT NULL,
  `currency` VARCHAR(191) NOT NULL,
  `fxRate` DOUBLE NULL,
  `note` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE INDEX `referral_credit_ledger_rewardId_paymentId_key`(`rewardId`, `paymentId`),
  INDEX `referral_credit_ledger_clientId_currency_createdAt_idx`(`clientId`, `currency`, `createdAt`),
  INDEX `referral_credit_ledger_paymentId_idx`(`paymentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `referral_audit_logs` (
  `id` VARCHAR(191) NOT NULL,
  `actorUserId` VARCHAR(191) NULL,
  `actorRole` VARCHAR(191) NOT NULL,
  `action` VARCHAR(191) NOT NULL,
  `clientId` VARCHAR(191) NULL,
  `referralId` VARCHAR(191) NULL,
  `rewardId` VARCHAR(191) NULL,
  `before` JSON NULL,
  `after` JSON NULL,
  `reason` TEXT NULL,
  `ipAddress` VARCHAR(64) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `referral_audit_logs_clientId_createdAt_idx`(`clientId`, `createdAt`),
  INDEX `referral_audit_logs_action_createdAt_idx`(`action`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `client_notifications` (
  `id` VARCHAR(191) NOT NULL,
  `clientId` VARCHAR(191) NOT NULL,
  `type` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `message` TEXT NOT NULL,
  `link` VARCHAR(191) NULL,
  `eventKey` VARCHAR(191) NOT NULL,
  `readAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE INDEX `client_notifications_clientId_eventKey_key`(`clientId`, `eventKey`),
  INDEX `client_notifications_clientId_readAt_createdAt_idx`(`clientId`, `readAt`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Columnas aditivas en tablas existentes.
ALTER TABLE `clients`
  ADD COLUMN `referralCode` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `clients_referralCode_key` ON `clients`(`referralCode`);

ALTER TABLE `payments`
  ADD COLUMN `creditApplied` DOUBLE NOT NULL DEFAULT 0,
  ADD COLUMN `creditCurrency` VARCHAR(191) NULL;

ALTER TABLE `app_config`
  ADD COLUMN `referralFxUsdClp` DOUBLE NULL;

-- Claves foráneas.
ALTER TABLE `referrals`
  ADD CONSTRAINT `referrals_referrerClientId_fkey`
    FOREIGN KEY (`referrerClientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `referrals_referredClientId_fkey`
    FOREIGN KEY (`referredClientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `referral_payments`
  ADD CONSTRAINT `referral_payments_referralId_fkey`
    FOREIGN KEY (`referralId`) REFERENCES `referrals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `referral_payments_paymentId_fkey`
    FOREIGN KEY (`paymentId`) REFERENCES `payments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `referral_rewards`
  ADD CONSTRAINT `referral_rewards_referrerClientId_fkey`
    FOREIGN KEY (`referrerClientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `referral_rewards_referralId_fkey`
    FOREIGN KEY (`referralId`) REFERENCES `referrals`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `referral_credit_ledger`
  ADD CONSTRAINT `referral_credit_ledger_clientId_fkey`
    FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `referral_credit_ledger_rewardId_fkey`
    FOREIGN KEY (`rewardId`) REFERENCES `referral_rewards`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `referral_credit_ledger_paymentId_fkey`
    FOREIGN KEY (`paymentId`) REFERENCES `payments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `client_notifications`
  ADD CONSTRAINT `client_notifications_clientId_fkey`
    FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
