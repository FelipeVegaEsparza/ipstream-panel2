ALTER TABLE `radio_streams`
  ADD COLUMN `aiTimeEveryMinutes` INT NOT NULL DEFAULT 0,
  ADD COLUMN `aiWeatherEveryMinutes` INT NOT NULL DEFAULT 0;
