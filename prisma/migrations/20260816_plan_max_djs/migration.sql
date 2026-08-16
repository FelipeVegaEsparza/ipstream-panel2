-- Add maxDjs to Plan: hard integer cap for DJ slots per radio.
-- Default 4 preserves current behaviour. NOT NULL; null/unlimited is not supported in this change.
-- The DEFAULT clause backfills every existing plan row in a single statement.

ALTER TABLE `plans`
  ADD COLUMN `maxDjs` INT NOT NULL DEFAULT 4;