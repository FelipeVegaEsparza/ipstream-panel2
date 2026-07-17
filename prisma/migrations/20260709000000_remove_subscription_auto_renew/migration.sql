-- DropIndex
DROP INDEX IF EXISTS `subscriptions_clientId_key` ON `subscriptions`;

-- AlterTable: drop autoRenew column from subscriptions
ALTER TABLE `subscriptions` DROP COLUMN `autoRenew`;

-- RecreateIndex
CREATE UNIQUE INDEX `subscriptions_clientId_key` ON `subscriptions`(`clientId`);
