ALTER TABLE `app_config`
  ADD COLUMN `elevenLabsApiKeyEnc` TEXT NULL,
  ADD COLUMN `elevenLabsVoiceId` VARCHAR(191) NULL,
  ADD COLUMN `elevenLabsModel` VARCHAR(191) NULL,
  ADD COLUMN `elevenLabsEnabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `ttsCacheEnabled` BOOLEAN NOT NULL DEFAULT true;
