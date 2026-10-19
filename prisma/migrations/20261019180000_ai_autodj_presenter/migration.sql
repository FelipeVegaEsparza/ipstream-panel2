ALTER TABLE `radio_streams`
  ADD COLUMN `aiPresenterEnabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `aiPresenterEvery` INT NOT NULL DEFAULT 3;
