-- Se retira la función de reseñas IA.
DROP TABLE IF EXISTS `ai_reviews`;

ALTER TABLE `radio_streams`
  DROP COLUMN `aiReviewEveryTracks`,
  DROP COLUMN `aiReviewStyle`,
  DROP COLUMN `aiReviewAdminEnabled`;
