-- Migration: multi streaming server (control plane / data plane separation)

-- 1. Servidores de streaming
CREATE TABLE IF NOT EXISTS `streaming_servers` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `type` VARCHAR(191) NOT NULL DEFAULT 'both',
  `baseUrl` VARCHAR(191) NOT NULL,
  `tokenEnc` TEXT NOT NULL,
  `publicHostname` VARCHAR(191) NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `isHealthy` BOOLEAN NOT NULL DEFAULT true,
  `lastHealthAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  INDEX `streaming_servers_type_idx` (`type`),
  INDEX `streaming_servers_isActive_idx` (`isActive`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Asignación por servicio en radio_streams
ALTER TABLE `radio_streams` ADD COLUMN `serverId` VARCHAR(191) NULL;

-- 3. Asignación por servicio en video_streams
ALTER TABLE `video_streams` ADD COLUMN `serverId` VARCHAR(191) NULL;

-- 4. Unicidad de puerto telnet por servidor (en lugar de global)
ALTER TABLE `radio_streams` DROP INDEX `radio_streams_liquidsoapTelnetPort_key`;
CREATE UNIQUE INDEX `radio_streams_serverId_liquidsoapTelnetPort_key` ON `radio_streams`(`serverId`, `liquidsoapTelnetPort`);

-- 5. Índices y FKs
CREATE INDEX `radio_streams_serverId_idx` ON `radio_streams`(`serverId`);
CREATE INDEX `video_streams_serverId_idx` ON `video_streams`(`serverId`);

ALTER TABLE `radio_streams` ADD CONSTRAINT `radio_streams_serverId_fkey`
  FOREIGN KEY (`serverId`) REFERENCES `streaming_servers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `video_streams` ADD CONSTRAINT `video_streams_serverId_fkey`
  FOREIGN KEY (`serverId`) REFERENCES `streaming_servers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
