-- Migration: email de notificaciones del panel (configurable)

ALTER TABLE `app_config` ADD COLUMN `adminNotifyEmail` VARCHAR(191) NULL;
