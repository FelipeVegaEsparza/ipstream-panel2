-- AlterTable
ALTER TABLE `app_config` ADD COLUMN `ttsQualityPreset` VARCHAR(191) NOT NULL DEFAULT 'natural',
    ADD COLUMN `pronunciationDictionaryId` VARCHAR(191) NULL,
    ADD COLUMN `pronunciationDictionaryVersionId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `radio_streams` ADD COLUMN `aiVoicePreset` VARCHAR(40) NULL;
