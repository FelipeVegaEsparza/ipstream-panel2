## Purpose

Protect harbor connection and disconnection callbacks from leaking authentication credentials into logs, process listings, or command history.

## ADDED Requirements

### Requirement: Harbor callbacks authenticate via header
The agent SHALL authenticate `POST /api/streams/:clientId/harbor/connected` and `POST /api/streams/:clientId/harbor/disconnected` using an `X-Harbor-Token` header instead of a query parameter.

#### Scenario: Valid callback token in header
- **WHEN** Liquidsoap sends a harbor callback with a valid `X-Harbor-Token` header
- **THEN** the agent processes the callback and returns `200 OK`

#### Scenario: Token provided only as query parameter
- **WHEN** a request sends the token as `?token=...` without the header
- **THEN** the agent returns `401 Unauthorized`

#### Scenario: Missing or invalid token
- **WHEN** a request lacks the header or sends an invalid value
- **THEN** the agent returns `401 Unauthorized` and logs a security warning

### Requirement: Callback URL must not contain secrets
The generated Liquidsoap script SHALL include the callback URL without the token in the query string; the token SHALL be provided through the HTTP header.

#### Scenario: Inspecting a generated .liq file
- **WHEN** an operator reads the generated Liquidsoap script
- **THEN** the callback URL contains no query parameter with the harbor secret
