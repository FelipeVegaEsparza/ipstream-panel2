## ADDED Requirements

### Requirement: UI distinguishes DJs that are on air from DJs that are on standby
The system SHALL indicate for every connected DJ whether that DJ is currently broadcasting or is connected but preempted by a higher-priority role.

#### Scenario: Owner preempts a guest
- **WHEN** a guest DJ is connected and an owner DJ connects to the same radio
- **THEN** the dashboard marks the owner as "On air" and the guest as "Connected — standby"

### Requirement: Connected DJs are ordered by effective priority
The dashboard SHALL list connected DJs using the same ordering as the Liquidsoap fallback chain: role hierarchy first, then numeric priority.

#### Scenario: Mixed roles connected
- **WHEN** a guest, an owner, and a host are all connected
- **THEN** the dashboard displays them in the order owner, host, guest

### Requirement: Plan-aware mount list supports large caps
When the plan allows more than a small number of DJs, the system SHALL provide an ergonomic mount selector instead of a fixed or oversized dropdown.

#### Scenario: Plan allows 16 DJs
- **WHEN** a client with `Plan.maxDjs = 16` creates a DJ slot
- **THEN** the UI offers the next available mount by default and allows numeric selection within the allowed range

## MODIFIED Requirements

### Requirement: DJ slots connect and disconnect independently
The system SHALL track the connection state of each DJ slot independently. Multiple DJ slots on the same radio MAY be connected at the same time, and the system SHALL report each one in the harbor status without conflating them. An authorized user MAY forcibly disconnect an individual slot through a kick action.

#### Scenario: Two DJs connected simultaneously
- **WHEN** DJ A connects to slot `/dj1` and DJ B connects to slot `/dj3` within the same radio
- **THEN** `GET /api/streams/:clientId/harbor/status` returns `activeDjs` with two entries, one per slot, each with its own `connectedAt` and `onAir` flag. `RadioStream.status` remains `live`.

#### Scenario: One DJ disconnects, the other stays
- **WHEN** DJ A disconnects from `/dj1` while DJ B is still connected to `/dj3`
- **THEN** `GET /api/streams/:clientId/harbor/status` returns `activeDjs` with only the entry for `/dj3`. `RadioStream.status` remains `live`.

#### Scenario: Authorized user kicks a connected DJ
- **WHEN** an owner or admin kicks the DJ connected to `/dj3`
- **THEN** the DJ is disconnected, the remaining active DJs continue, and `RadioStream.status` only transitions to `autodj` if no DJs remain
