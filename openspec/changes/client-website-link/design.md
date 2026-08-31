## Context

Cada cliente tiene un `BasicData` (tabla `basic_data`) con `projectName`, `projectDescription`, `logoUrl`, `coverUrl`, `radioStreamingUrl`, `videoStreamingUrl` y más. El admin edita los datos del cliente desde `app/admin/users/[id]/edit` vía `components/admin/UserForm.tsx`, que hace PUT a `/api/admin/users/[id]`. El dashboard del cliente usa `app/dashboard/layout.tsx` (server component) que resuelve el cliente efectivo y pasa `user` a `DashboardLayoutClient` → `Header.tsx` (client component), donde ya hay links rápidos (Tutoriales, Soporte).

El sitio web público del cliente ya existe como concepto (la API `/api/public/[clientId]` expone su data), pero la URL de ese sitio no se guarda en ninguna parte.

Motivación y alcance: ver `proposal.md`. Requisitos de comportamiento: ver `specs/client/site-url/spec.md`.

## Goals / Non-Goals

**Goals:**
- Campo `websiteUrl` en `BasicData`, configurable solo por el admin.
- Botón "Ir a mi sitio Web" en el header del dashboard, visible solo si hay URL.
- Validación de URL.

**Non-Goals:**
- No se crea ni aloja el sitio web del cliente (solo se guarda su URL externa).
- No se expone la URL al cliente para editar (solo lectura en su dashboard).
- No se cambia la API pública ni las URLs de streaming.

## Decisions

### 1. `websiteUrl` vive en `BasicData`
La URL es un dato del proyecto del cliente, igual que `projectName` o `logoUrl`; encaja naturalmente en `basic_data`. Se agrega la columna `websiteUrl String? @db.VarChar(500)` (o `@db.Text`), sin valor por defecto (null = sin sitio).

### 2. Se configura desde el admin en `UserForm`
En `components/admin/UserForm.tsx` se agrega un campo "Sitio web del cliente" en la sección "Información del Proyecto". Se extienden los esquemas `createUserSchema`/`editUserSchema` con `websiteUrl` (URL opcional o vacío). El PUT de `/api/admin/users/[id]` guarda `websiteUrl` en `BasicData` (upsert por clientId).

- **Alternativa considerada:** dejarlo en el formulario de Datos Básicos del cliente (`/dashboard/basic-data`). Se descarta: el usuario pidió que solo el admin lo configure.

### 3. El botón del header obtiene la URL desde el layout (server)
`app/dashboard/layout.tsx` ya es un server component con acceso a `getEffectiveClient()` y Prisma. Ahí se consulta `basicData.websiteUrl` del cliente efectivo y se pasa como prop a `DashboardLayoutClient` → `Header.tsx`, que muestra el botón `<a href target="_blank">Ir a mi sitio Web</a>` solo si hay URL.

- **Alternativa considerada:** que el header haga `fetch('/api/dashboard/basic-data')`. Se descarta: el layout ya tiene el cliente y evita un round-trip y estados de carga en el header.

### 4. Validación
En `lib/validations.ts`, el `basicDataSchema` ya valida URLs; el nuevo campo se valida igual (`.url()` opcional o `''`). En `UserForm` se usa el mismo patrón.

## Risks / Trade-offs

- **Migración de columna** → Se agrega con `prisma db push` en el deploy (ya es el flujo habitual) o una migración dedicada; `websiteUrl` es nullable, sin riesgo de datos.
- **Impersonación** → El layout usa `getEffectiveClient()`, así que el botón muestra el sitio del cliente impersonado (correcto, es el mismo flujo que el resto del dashboard).
- **URL externa** → Se abre con `target="_blank"` + `rel="noopener noreferrer"` para seguridad.
