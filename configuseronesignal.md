El cron está funcionando correctamente. Ahora también debes configurar el webhook en cada aplicación OneSignal (por cliente):
1. Ve al Dashboard de OneSignal (https://dashboard.onesignal.com)
2. Por cada App (cada cliente) ve a Settings → Webhooks
3. Agrega un webhook con:
- URL: https://dashboard.ipstream.cl/api/webhook/onesignal
- Events: marca Notification Clicked
- Headers: Authorization: Bearer {el mismo ONESIGNAL_WEBHOOK_SECRET del .env}