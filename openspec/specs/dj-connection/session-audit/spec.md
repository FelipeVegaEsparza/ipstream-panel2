# DJ Session Audit Specification

## Purpose

Create a durable record of every DJ connect and disconnect event to support troubleshooting, usage analysis, and accountability.

## Requirements

### Requirement: DJ sessions are persisted
The system SHALL create a row in `dj_sessions` for every DJ connection event and close it when the DJ disconnects.

#### Scenario: DJ connects and disconnects
- **WHEN** a DJ connects to a slot and later disconnects
- **THEN** a `dj_sessions` row exists with `startedAt`, `endedAt`, `durationSeconds`, `mount`, `djId`, `clientId`, and `ipAddress`

#### Scenario: Agent restarts mid-session
- **WHEN** the agent restarts while a DJ is connected and later reconstructs the state
- **THEN** the existing session continues and is closed on disconnect without creating duplicates

### Requirement: Sessions capture source metadata
Each session SHALL store the DJ slot, client, mount, connection timestamp, disconnection timestamp, source IP, and role at connection time.

#### Scenario: Two DJs connect from different IPs
- **WHEN** two DJs connect from different source addresses
- **THEN** each session stores its own `ipAddress`

### Requirement: Session history is queryable by client
The system SHALL provide an endpoint that returns DJ session history for a radio, paginated and ordered by start time descending.

#### Scenario: Admin views last 30 days
- **WHEN** an admin requests DJ session history for a client
- **THEN** the response contains connect/disconnect events with duration and mount
