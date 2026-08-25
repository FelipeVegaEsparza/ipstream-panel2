-- Migration: provisioning automático de nodos (SSH desde el panel)

ALTER TABLE `streaming_servers`
  ADD COLUMN `sshHost` VARCHAR(191) NULL,
  ADD COLUMN `sshPort` INT NOT NULL DEFAULT 22,
  ADD COLUMN `sshUser` VARCHAR(191) NOT NULL DEFAULT 'root',
  ADD COLUMN `sshAuthType` VARCHAR(191) NOT NULL DEFAULT 'key',
  ADD COLUMN `sshKeyEnc` TEXT NULL,
  ADD COLUMN `sshPasswordEnc` TEXT NULL,
  ADD COLUMN `provisionStatus` VARCHAR(191) NOT NULL DEFAULT 'none',
  ADD COLUMN `provisionStep` VARCHAR(191) NULL,
  ADD COLUMN `provisionError` TEXT NULL,
  ADD COLUMN `provisionLog` JSON NULL,
  ADD COLUMN `provisionStartedAt` DATETIME(3) NULL,
  ADD COLUMN `provisionedAt` DATETIME(3) NULL;

CREATE INDEX `streaming_servers_provisionStatus_idx` ON `streaming_servers`(`provisionStatus`);
