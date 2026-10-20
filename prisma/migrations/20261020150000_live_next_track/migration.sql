ALTER TABLE `radio_streams`
  ADD COLUMN `currentNextTitle` VARCHAR(300) NULL,
  ADD COLUMN `currentNextArtist` VARCHAR(300) NULL,
  ADD COLUMN `currentNextCoverUrl` VARCHAR(500) NULL;
