-- Intro/cierre propios por playlist.
-- Reutiliza la tabla de jingles con un rol (kind) para no duplicar el pipeline
-- de subida/AI, y oculta esas filas de la rotación de jingles.

ALTER TABLE `jingles`
  ADD COLUMN `kind` VARCHAR(191) NOT NULL DEFAULT 'jingle';

CREATE INDEX `jingles_clientId_kind_idx` ON `jingles`(`clientId`, `kind`);

ALTER TABLE `playlists`
  ADD COLUMN `introJingleId` VARCHAR(191) NULL,
  ADD COLUMN `outroJingleId` VARCHAR(191) NULL;

CREATE INDEX `playlists_introJingleId_idx` ON `playlists`(`introJingleId`);
CREATE INDEX `playlists_outroJingleId_idx` ON `playlists`(`outroJingleId`);

ALTER TABLE `playlists`
  ADD CONSTRAINT `playlists_introJingleId_fkey`
    FOREIGN KEY (`introJingleId`) REFERENCES `jingles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `playlists_outroJingleId_fkey`
    FOREIGN KEY (`outroJingleId`) REFERENCES `jingles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
