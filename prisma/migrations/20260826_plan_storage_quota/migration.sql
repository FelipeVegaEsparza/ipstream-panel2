-- Migration: cuota de almacenamiento por plan

ALTER TABLE `plans`
  ADD COLUMN `radioStorageQuotaMB` INT NULL,
  ADD COLUMN `videoStorageQuotaMB` INT NULL;
