## Purpose

Give admins and clients visibility into DJ connection attempts, failures, and recent Liquidsoap logs so they can diagnose encoder problems without server access.

## ADDED Requirements

### Requirement: Recent Liquidsoap logs are exposed via API
The agent SHALL expose an endpoint that returns the last N lines of a client's Liquidsoap log file.

#### Scenario: DJ cannot connect
- **WHEN** a client opens the connection page and requests logs
- **THEN** the panel displays the most recent connection attempts and errors from Liquidsoap

### Requirement: Session history is visible in the dashboard
The client dashboard SHALL display a list of recent DJ sessions with start time, duration, and mount.

#### Scenario: Client reviews yesterday's broadcasts
- **WHEN** a client views the connection page
- **THEN** a "Recent sessions" section shows yesterday's DJs, durations, and mounts

### Requirement: DJ slot status distinguishes on-air vs standby
The dashboard SHALL show whether each connected DJ is currently broadcasting (on air) or connected but waiting in the fallback chain.

#### Scenario: Owner and guest both connected
- **WHEN** an owner and a guest are connected at the same time
- **THEN** the owner is marked "On air" and the guest is marked "Connected — standby"
