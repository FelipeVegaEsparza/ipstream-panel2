ALTER TABLE `app_config`
  ADD COLUMN `ttsProvider` VARCHAR(20) NOT NULL DEFAULT 'elevenlabs',
  ADD COLUMN `fishAudioApiKeyEnc` TEXT NULL,
  ADD COLUMN `fishAudioModel` VARCHAR(80) NULL,
  ADD COLUMN `fishAudioReferenceId` VARCHAR(191) NULL;
