-- Migration: servicios incluidos en el plan

ALTER TABLE `plans` ADD COLUMN `services` VARCHAR(191) NOT NULL DEFAULT 'both';
