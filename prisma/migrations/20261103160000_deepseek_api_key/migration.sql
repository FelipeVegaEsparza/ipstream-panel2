-- API key del proveedor de texto para los textos de Especiales (encriptada en la app).
-- Migración aditiva: sin clave la función queda apagada.

ALTER TABLE `app_config`
  ADD COLUMN `deepseekApiKeyEnc` TEXT NULL;
