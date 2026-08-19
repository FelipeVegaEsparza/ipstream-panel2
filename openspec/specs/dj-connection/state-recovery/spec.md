# DJ State Recovery Specification

## Purpose

Ensure the agent always knows which DJ slots are connected by reconciling in-memory state with Liquidsoap and the database across restarts, missed callbacks, and race conditions.

## Requirements

### Requirement: Agent reconstructs active DJ slots on startup
The agent SHALL query Liquidsoap's harbor inputs via telnet on startup to rebuild the `_djActive` map for every running stream before exposing status endpoints or starting the watcher.

#### Scenario: Agent restarts while a DJ is connected
- **WHEN** the agent process restarts and a DJ is currently connected to a harbor input
- **THEN** the agent populates `_djActive` with that slot and sets `radio_streams.status` to `live`

### Requirement: Missing disconnect callbacks are detected and repaired
The DJ watcher SHALL compare the active harbor inputs reported by Liquidsoap against `radio_streams.status` every check interval.

#### Scenario: Callback of disconnect is lost
- **WHEN** the database shows `status='live'` but Liquidsoap reports no connected DJs
- **THEN** the watcher updates `radio_streams.status` to `autodj` and logs a recovery audit entry

### Requirement: Hidden connects are detected and repaired
The DJ watcher SHALL also detect when Liquidsoap reports connected DJs but the database shows `status='autodj'`.

#### Scenario: Callback of connect is lost
- **WHEN** the database shows `status='autodj'` but Liquidsoap reports at least one connected DJ
- **THEN** the watcher updates `radio_streams.status` to `live` and logs a recovery audit entry

### Requirement: Recovery actions are idempotent
The watcher SHALL only write to the database or audit log when the reconciled state differs from the current state.

#### Scenario: No inconsistency exists
- **WHEN** the watcher runs and Liquidsoap state matches the database state
- **THEN** no updates or audit entries are produced
