-- AlterTable: track image attribution for AI-generated drafts (hot-linked images)
ALTER TABLE `global_news`
    ADD COLUMN `imageSource` VARCHAR(100) NULL;
