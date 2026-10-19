ALTER TABLE `plans`
  ADD COLUMN `aiMusicMinutes` INT NOT NULL DEFAULT 0;

ALTER TABLE `ai_tts_usage`
  ADD COLUMN `musicSeconds` INT NOT NULL DEFAULT 0;
