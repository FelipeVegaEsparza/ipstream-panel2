ALTER TABLE `app_config`
  ADD COLUMN `elevenLabsVoices` TEXT NULL;

ALTER TABLE `radio_streams`
  ADD COLUMN `aiVoiceId` VARCHAR(191) NULL,
  ADD COLUMN `aiVoiceStyle` INT NOT NULL DEFAULT 0;
