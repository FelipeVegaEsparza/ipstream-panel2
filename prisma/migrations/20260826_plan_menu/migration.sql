-- Migration: secciones de dashboard incluidas por plan

ALTER TABLE `plans` ADD COLUMN `menuHiddenKeys` TEXT NULL;
