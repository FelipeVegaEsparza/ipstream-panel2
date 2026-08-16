## Purpose

Permite que una radio tenga hasta N DJs configurados y operando en vivo de forma simultánea, donde N viene del `Plan.maxDjs` del cliente. Los mounts se asignan dinámicamente como `/dj1`, `/dj2`, …, `/djN`, reutilizando enteros cuando se borran slots intermedios. El AutoDJ se silencia mientras haya al menos un DJ conectado y se reanuda solo cuando el último se desconecta.

## ADDED Requirements

### Requirement: DJ slot limit is plan-driven (integer)
The system SHALL bound the number of DJ slots per radio by the integer value of `Plan.maxDjs` (default 4). The column MUST be `NOT NULL`; null/unlimited caps are not supported in this version. When the plan's value is unknown or has not been backfilled, the system SHALL treat it as 4.

#### Scenario: Plan allows 8 DJs
- **WHEN** a client with `Plan.maxDjs = 8` creates their 8th DJ slot via `POST /api/streams/:clientId/djs`
- **THEN** the system accepts the request and returns `200 { ok: true, id, name, mount }` with `mount = "/dj8"`

#### Scenario: Plan cap reached
- **WHEN** a client tries to create a DJ slot and already has `maxDjs` slots configured
- **THEN** the system returns `400 { error: "max_djs_reached", planMaxDjs: <n> }`

#### Scenario: Plan with no value (legacy)
- **WHEN** a legacy plan has `maxDjs IS NULL` (pre-migration) and the client tries to create a 5th DJ slot
- **THEN** the system applies the default cap of 4 and returns `400 { error: "max_djs_reached", planMaxDjs: 4 }`

### Requirement: DJ mount allocation is sequential and gapless
The system SHALL assign DJ mount names as `/dj1`, `/dj2`, …, `/djN` where N is the next available slot up to the plan cap. When a slot in the middle is deleted, the mount of the deleted slot becomes available for reuse. The system SHALL NOT skip numbers and SHALL NOT reuse mounts from non-deleted slots.

#### Scenario: Create DJs one by one
- **WHEN** a client creates DJs in order with no deletions
- **THEN** the assigned mounts are `/dj1`, `/dj2`, `/dj3` in that order

#### Scenario: Delete and re-create fills the gap
- **WHEN** a client deletes the slot with mount `/dj2` and then creates a new DJ
- **THEN** the new DJ receives mount `/dj2` (not `/dj4`)

#### Scenario: Mount update collision
- **WHEN** a client calls `PATCH /api/streams/:clientId/djs/:djId` with `mount = "/dj2"` and another slot already owns `/dj2`
- **THEN** the system returns `409 { error: "mount_in_use" }` and the change is not applied

#### Scenario: availableMounts reflects current state
- **WHEN** a client calls `GET /api/streams/:clientId/harbor/status`
- **THEN** the response includes `planMaxDjs: <int>` and `availableMounts: ["/djX", "/djY", …]` containing every mount from `/dj1` to `/dj<planMaxDjs>` not already assigned to an existing slot

### Requirement: DJ slots connect and disconnect independently
The system SHALL track the connection state of each DJ slot independently. Multiple DJ slots on the same radio MAY be connected at the same time, and the system SHALL report each one in the harbor status without conflating them.

#### Scenario: Two DJs connected simultaneously
- **WHEN** DJ A connects to slot `/dj1` and DJ B connects to slot `/dj3` within the same radio
- **THEN** `GET /api/streams/:clientId/harbor/status` returns `activeDjs` with two entries, one per slot, each with its own `connectedAt`. `RadioStream.status` remains `live`.

#### Scenario: One DJ disconnects, the other stays
- **WHEN** DJ A disconnects from `/dj1` while DJ B is still connected to `/dj3`
- **THEN** `GET /api/streams/:clientId/harbor/status` returns `activeDjs` with only the entry for `/dj3`. `RadioStream.status` remains `live`.

### Requirement: AutoDJ transitions only when all DJs disconnect
The system SHALL keep AutoDJ silent whenever at least one DJ slot is connected, and SHALL resume AutoDJ only when the last DJ slot disconnects. The transition of `RadioStream.status` between `autodj` and `live` MUST happen exactly once per state change trigger.

#### Scenario: First DJ connects
- **WHEN** the first DJ of a radio connects to any slot
- **THEN** `RadioStream.status` transitions from `autodj` to `live` and a `StreamingAuditLog` entry with `action = 'dj_connected'` is written

#### Scenario: First DJ of N disconnects
- **WHEN** the first of N connected DJs disconnects and N > 1
- **THEN** `RadioStream.status` remains `live`. No transition is logged.

#### Scenario: Last DJ disconnects
- **WHEN** the last connected DJ disconnects
- **THEN** `RadioStream.status` transitions from `live` to `autodj`. A `StreamingAuditLog` entry with `action = 'dj_disconnected'` is written.

### Requirement: UI exposes plan-aware mount list and shows all connected DJs
The Panel SHALL render the DJ management UI using the dynamic mount list returned by the agent (`GET /api/streams/:clientId/harbor/status` → `availableMounts` and `planMaxDjs`). The "Crear DJ" button SHALL be disabled when the plan cap is reached. The status banner SHALL list all currently connected DJs when more than one is on air, not just one.

#### Scenario: Mount dropdown reflects plan
- **WHEN** a client with `Plan.maxDjs = 12` and 3 existing slots opens the "Nuevo DJ" modal
- **THEN** the mount dropdown shows the 9 unused mounts from `/dj1` to `/dj12` (excluding `/dj1`, `/dj2`, `/dj3` already taken), not a fixed list of 4

#### Scenario: Status banner with multiple DJs
- **WHEN** two DJs are connected to the same radio and the dashboard loads
- **THEN** the status banner displays both DJ names ordered by role priority (`owner > host > guest`) then by `priority` ascending, joined with " + "

#### Scenario: Create button respects plan cap
- **WHEN** the client has `maxDjs` slots already configured
- **THEN** the "+ Nuevo DJ" button is disabled with a tooltip showing "Plan máximo: N DJs"

#### Scenario: Default cap for legacy plans
- **WHEN** a legacy plan has `maxDjs IS NULL` and the client already has 4 slots
- **THEN** the "+ Nuevo DJ" button is disabled with the tooltip showing "Plan máximo: 4 DJs" (default applied)