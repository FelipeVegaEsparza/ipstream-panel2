# Spec Delta

## Purpose

Define cómo el audio mezclado en el navegador llega de forma autenticada al stream de radio, con un transporte intercambiable, un puente hacia Liquidsoap y una meta de calidad verificable.

## ADDED Requirements

### Requirement: Authorized live session

The panel SHALL issue a short-lived authorization scoped to one client and one DJ slot. The streaming agent SHALL validate that authorization before accepting audio. An authorization SHALL be single-use for starting a session and SHALL expire quickly. Unauthorized or expired attempts SHALL be rejected without affecting other sessions.

#### Scenario: Valid authorization
- **WHEN** the panel issues an authorization for an available slot and the browser presents it to the agent
- **THEN** the agent accepts the session and associates it with the client and slot

#### Scenario: Expired or reused authorization
- **WHEN** an authorization is expired or was already consumed
- **THEN** the agent rejects the session and no audio is published

#### Scenario: Cross-client attempt
- **WHEN** an authorization issued for one client is presented for another client or slot
- **THEN** the agent rejects the attempt and records the failure

### Requirement: Pluggable transport contract

The system SHALL support at least two audio transports behind a single session contract: WebRTC via WHIP as the primary transport and an authenticated WebSocket audio fallback. Switching transports SHALL NOT require changes to the mixer behavior or to the user's session workflow.

#### Scenario: Primary transport selected
- **WHEN** the console starts a session and WebRTC is available
- **THEN** audio is negotiated over WHIP

#### Scenario: Fallback transport selected
- **WHEN** WebRTC negotiation fails or the quality gate rejects it
- **THEN** the console starts the same session over the WebSocket transport without requiring the user to rebuild the mix

### Requirement: WebRTC ingest via WHIP

The node SHALL expose WHIP signaling over HTTPS through the node reverse proxy and SHALL transport media over a dedicated UDP port with a correctly advertised candidate address. The agent SHALL validate the session before forwarding signaling. Media SHALL not depend on unauthenticated publish access.

#### Scenario: Browser publishes over WHIP
- **WHEN** an authorized browser posts a WHIP offer for its slot
- **THEN** the media server accepts the session and media flows to the node's UDP candidate

#### Scenario: Unauthenticated publish
- **WHEN** a client attempts to publish without a valid authorization
- **THEN** the attempt is rejected and no stream is created

#### Scenario: UDP unavailable
- **WHEN** the client cannot reach the node's UDP candidate
- **THEN** the session reports the connectivity failure and can fall back to the WebSocket transport

### Requirement: WebSocket audio fallback

The agent SHALL accept an authenticated audio stream over WebSocket, publish it to the selected slot, and release all resources when the stream closes. The fallback SHALL preserve stereo and SHALL report its negotiated bitrate.

#### Scenario: Fallback session
- **WHEN** the console connects over WebSocket with a valid authorization
- **THEN** the agent accepts the stream and the slot becomes on air

#### Scenario: Fallback disconnect
- **WHEN** the WebSocket closes or the heartbeat expires
- **THEN** the agent stops the publisher, releases the slot, and allows the AutoDJ to resume

### Requirement: Harbor handoff and AutoDJ fallback

The agent SHALL connect the live source to the selected Liquidsoap harbor mount using the slot credentials so that existing connect/disconnect callbacks, role priority, and fallback behavior remain authoritative. The agent SHALL start the handoff when a live source is accepted and stop it when the source ends, cleaning up orphaned processes.

#### Scenario: Live source preempts AutoDJ
- **WHEN** the live source connects to the selected slot
- **THEN** Liquidsoap treats it as a connected DJ and the AutoDJ stops being the on-air source according to existing priority rules

#### Scenario: Live source ends
- **WHEN** the live source disconnects
- **THEN** the slot is released and the AutoDJ resumes through the existing fallback chain

#### Scenario: Orphaned bridge
- **WHEN** the agent restarts or detects a bridge process without an active live session
- **THEN** it terminates the orphan and reconciles the slot state without duplicating sources

### Requirement: Audio quality target

Live radio sessions SHALL target 192 kbps and SHALL preserve stereo. Intermediate encodings SHALL be at least 192 kbps. The implementation SHALL include an A/B quality gate comparing the browser-originated chain against a direct 192 kbps encoder reference before the transport choice is considered final.

#### Scenario: Stereo and bitrate preserved
- **WHEN** a live session is active
- **THEN** the published stream reports stereo and the targeted 192 kbps bitrate

#### Scenario: Quality gate
- **WHEN** the A/B quality gate is executed
- **THEN** the selected transport meets the agreed acceptance criteria and the result is recorded

#### Scenario: Quality gate fails
- **WHEN** the primary transport fails the quality gate
- **THEN** the fallback transport is selected for live radio audio without changing the console experience

### Requirement: Node provisioning and security

The node provisioning and deployment SHALL configure the signaling route, the WebRTC media port, the advertised candidate address, and the required firewall rules. The system SHALL NOT expose an unauthenticated publish path on any node.

#### Scenario: New node provisioned
- **WHEN** a streaming node is provisioned or updated
- **THEN** its configuration includes the live ingest signaling route, media port, and candidate address

#### Scenario: Node update
- **WHEN** the agent or node configuration changes
- **THEN** the operator is instructed to update each remote node before live ingest is expected to work

### Requirement: Observability

The agent SHALL expose the live session state, selected transport, negotiated bitrate, connection errors, and start/end events to the panel. Session start and end SHALL be recorded in the existing DJ session history.

#### Scenario: Dashboard status
- **WHEN** a live session is active or has failed
- **THEN** the dashboard can display the transport, bitrate, and error state for that slot

#### Scenario: Audit trail
- **WHEN** a live session starts or ends
- **THEN** the event is recorded with enough detail to troubleshoot the client, slot, and transport
