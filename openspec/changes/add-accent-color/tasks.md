# Tasks

## 1. Modelo y normalización

- [x] 1.1 Agregar `accentColor String?` al modelo `Client` en `prisma/schema.prisma` y verificar con `npx prisma validate` y `npx prisma db push` en desarrollo (la columna nullable debe crearse sin tocar datos existentes).
- [x] 1.2 Crear `lib/accent-color.ts` con `normalizeAccentColor(value): string | null` (solo `#RRGGBB` mayúsculas/minúsculas, normaliza a minúsculas, tolera `#` faltante; `null`/`""`/inválido → `null`; sin alpha) y verificar con `npx tsc --noEmit` más una comprobación rápida de los casos `#FF6B00` → `#ff6b00`, `red` → `null`, `#fff` → `null`, `#ff6b00cc` → `null`, `""` → `null`.

## 2. Exposición en la API pública

- [x] 2.1 En `app/api/public/[clientId]/route.ts`, incluir `accentColor` como campo raíz hermano de `selectedTemplate`, leyéndolo de `client.accentColor` y pasándolo por `normalizeAccentColor`; verificar contra el dev server que un cliente con color devuelve `"accentColor": "#ff6b00"`, uno sin color devuelve `null` (nunca `""`), y un valor persistido inválido devuelve `null`.
- [x] 2.2 Verificar que el resto del contrato no cambia: los campos existentes (`client`, `selectedTemplate`, `oneSignalAppId`, `basicData`, arrays) mantienen nombre/tipo, el `404` de cliente inexistente sigue y las respuestas conservan CORS `*`.
- [x] 2.3 Actualizar `instruccionesapi.md` (§1, tabla de campos raíz) con `accentColor` (`string | null`, minúsculas) y verificar que el ejemplo/tabla coincide con la salida real de `2.1`.

## 3. Guardado del color en el panel

- [x] 3.1 Extender `POST /api/dashboard/templates` para aceptar `accentColor` opcional: si la clave está presente debe ser `null` o `#RRGGBB` (si no, `400`), normalizarla y persistirla atómicamente con `templateId`; si la clave está ausente, dejar el color sin cambios (retrocompatibilidad). Verificar con sesión autenticada: `{ templateId, accentColor: "#FF6B00" }` guarda `#ff6b00`; `{ templateId, accentColor: null }` limpia; `{ templateId, accentColor: "red" }` devuelve `400`; `{ templateId }` no altera el color.
- [x] 3.2 Mantener los guards del endpoint (permiso de menú `template` y sesión) y verificar que sin permiso responde `403` y sin sesión `401`, sin modificar datos.

## 4. UI de activación con color

- [x] 4.1 Crear `components/dashboard/TemplateActivationModal.tsx` con color picker nativo, campo de texto hex, botón "Usar color de la plantilla" (`null`), precarga del valor recibido y estado que impide confirmar con hex inválido; verificar que renderiza y que confirmar emite `{ templateId, accentColor }`.
- [x] 4.2 Integrar el modal en `components/dashboard/TemplateSelector.tsx`: al pulsar "Seleccionar Plantilla" abrir el modal y guardar al confirmar; en la tarjeta activa ofrecer "Color destacado" que reabre el modal con la plantilla fija; precargar el color actual. Verificar en el navegador que activar, cambiar color y cancelar se comportan según las specs.
- [x] 4.3 En `app/dashboard/template/page.tsx`, seleccionar `accentColor` del cliente y pasarlo al selector; verificar que al recargar la página el color actual aparece precargado.
- [x] 4.4 Verificar de punta a punta en dev: fijar color, limpiar con "Usar color de la plantilla" y cambiar de plantilla conservando el color (B2), comprobando en cada caso el valor devuelto por `GET /api/public/{clientId}`.

## 5. Integración y cierre

- [x] 5.1 Ejecutar `npx prisma validate`, `npx tsc --noEmit` y `npm run lint` sin errores, y `npm run build` para confirmar que el panel compila.
- [x] 5.2 Confirmar que el cambio solo toca el panel (no `streaming/agent/*`): no se requiere pulsar "Actualizar nodo" y no se modifican rutas del agente.
