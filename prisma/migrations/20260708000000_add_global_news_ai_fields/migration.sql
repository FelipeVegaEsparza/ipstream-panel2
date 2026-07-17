-- AlterTable: add AI / draft fields to global_news
ALTER TABLE `global_news`
    ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'published',
    ADD COLUMN `source` VARCHAR(20) NOT NULL DEFAULT 'manual',
    ADD COLUMN `aiRunId` VARCHAR(40) NULL;

-- CreateIndex
CREATE INDEX `global_news_status_idx` ON `global_news`(`status`);
CREATE INDEX `global_news_aiRunId_idx` ON `global_news`(`aiRunId`);
CREATE INDEX `global_news_categoryId_status_idx` ON `global_news`(`categoryId`, `status`);
