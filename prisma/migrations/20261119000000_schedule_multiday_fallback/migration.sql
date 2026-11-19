-- Parrilla horaria multi-día y playlist de respaldo al terminar una franja.

ALTER TABLE `playlist_schedules`
  ADD COLUMN `daysOfWeek` VARCHAR(64) NULL;

-- Compatibilidad: las franjas existentes conservan su día actual.
UPDATE `playlist_schedules`
SET `daysOfWeek` = CAST(`dayOfWeek` AS CHAR)
WHERE `daysOfWeek` IS NULL;

ALTER TABLE `radio_streams`
  ADD COLUMN `scheduleFallbackPlaylistId` VARCHAR(191) NULL;
