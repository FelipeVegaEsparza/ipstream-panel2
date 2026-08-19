## Purpose

Allow authorized users to terminate a single DJ's harbor session without stopping the AutoDJ stream or affecting other DJs.

## ADDED Requirements

### Requirement: Authorized users can kick a connected DJ slot
The system SHALL expose an endpoint that disconnects a specific DJ slot from Liquidsoap when called by an authorized user.

#### Scenario: Admin kicks a guest DJ
- **WHEN** an admin or owner calls kick for a connected guest slot
- **THEN** that DJ is disconnected, the remaining DJs stay connected, and the fallback chain continues with the next active source

#### Scenario: Kick a slot that is not connected
- **WHEN** kick is called for a slot with no active connection
- **THEN** the endpoint returns success without error and no state changes

### Requirement: Kick emits audit event
Every successful kick SHALL create an audit log entry identifying the kicked DJ, the requester, and the timestamp.

#### Scenario: Owner kicks a co-host
- **WHEN** an owner kicks a host DJ
- **THEN** a `dj_kicked` audit entry is written with the slot mount and requester ID

### Requirement: Permission to kick is role-based
Only users with role `owner` or `ADMIN` SHALL be allowed to kick any slot; hosts SHALL only kick guests.

#### Scenario: Guest attempts to kick an owner
- **WHEN** a guest user calls kick on an owner slot
- **THEN** the endpoint returns `403 Forbidden`
