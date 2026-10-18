# Spec Delta

## Purpose

Permite a un cliente autenticado transmitir radio en vivo desde el navegador, con biblioteca local, mezcla de música y voz, monitoreo por auriculares y una sesión integrada a los slots DJ existentes.

## ADDED Requirements

### Requirement: Live console entry point and plan gating

The system SHALL expose a **Transmitir en vivo** section for Radio in the dashboard, separate from the external-encoder connection section. Access SHALL be controlled by the client's plan and SHALL require an assigned streaming server.

#### Scenario: Plan enables the live console
- **WHEN** a client with radio service and an assigned server has the live console enabled in its plan
- **THEN** the dashboard shows the **Transmitir en vivo** section and it can be opened

#### Scenario: Plan disables the live console
- **WHEN** a client's plan does not include the live console
- **THEN** the section is not available and a direct visit is rejected without exposing console controls

### Requirement: Local audio library access and persistence

The console SHALL let the user add audio files from their device through an explicit file selection, drag and drop, or an authorized directory. On supported browsers the console SHALL remember the authorized directory across sessions; on unsupported browsers it SHALL degrade to per-session file selection without blocking broadcast. Audio files SHALL remain on the user's device and SHALL NOT be uploaded to the server. The console SHALL persist only directory handles and index metadata.

#### Scenario: Remembered directory on a supported browser
- **WHEN** a user authorizes a music directory on a supported browser and reopens the console later
- **THEN** the console restores the library from the remembered handle after re-confirming permission, without re-selecting individual files

#### Scenario: Degraded mode on an unsupported browser
- **WHEN** the browser does not support persistent directory access
- **THEN** the console allows selecting files for the current session and clearly indicates that the library will not be remembered

#### Scenario: File no longer available
- **WHEN** a remembered file has moved or been deleted
- **THEN** the console marks it as unavailable and offers to re-link or remove it without interrupting the current session

#### Scenario: Large library scan
- **WHEN** the authorized directory contains many audio files
- **THEN** the console remains responsive while indexing and reports progress

### Requirement: Two-deck mixer with EQ and loops

The console SHALL provide two independent playback decks with play, pause, seek, gain, three-band equalization, and a crossfader. It SHALL support a queue with automatic advance, manual in/out loops, and beat-quantized loops when a track's tempo has been determined. Mixing SHALL use a single program bus.

#### Scenario: Crossfade between decks
- **WHEN** the user moves the crossfader from deck A to deck B while both decks are playing
- **THEN** the program mix transitions from A to B without silence or clipping

#### Scenario: Manual loop
- **WHEN** the user sets an in point and an out point on a deck and enables the loop
- **THEN** playback repeats that section until the loop is disabled

#### Scenario: Beat-quantized loop
- **WHEN** a tempo is known for the current track and the user enables a beat loop
- **THEN** the loop boundaries snap to the nearest beat and the loop length can be halved or doubled

#### Scenario: Automatic advance
- **WHEN** a deck finishes its current track and the queue has a next item
- **THEN** the console starts the next item on that deck using the configured crossfade

### Requirement: Microphone, talkover, and headphone monitoring

The console SHALL mix a microphone input with the music bus, applying a high-pass filter and automatic talkover attenuation of the music. The program mix SHALL be sent only to the live transport, while a cue bus SHALL be routed to the local output for headphone monitoring. The console SHALL require the user to confirm headphone use before going on air.

#### Scenario: Talkover
- **WHEN** the user speaks into the microphone while music is playing
- **THEN** the music level is automatically reduced and restored after speech ends

#### Scenario: Cue while on air
- **WHEN** the user cues deck B while deck A is on air
- **THEN** the cue is audible only in the local headphone output and does not reach the live program

#### Scenario: Headphones not confirmed
- **WHEN** the user attempts to go on air without confirming headphone use
- **THEN** the console blocks the action and explains the feedback risk

### Requirement: Live session lifecycle and slot integration

The console SHALL start a live session by selecting an authorized DJ slot (or the single default slot), connecting the program audio, and marking the slot as on air. It SHALL enforce the plan's maximum simultaneous DJs, role priority, and a single active console session per slot. Stopping, closing, or losing the connection SHALL end the session cleanly and allow the existing AutoDJ fallback to resume.

#### Scenario: Start broadcasting
- **WHEN** an authorized user selects a free slot and confirms going on air
- **THEN** the session becomes active, the slot is reported as connected, and audio reaches the radio stream

#### Scenario: Slot already in use
- **WHEN** a user tries to use a slot that already has an active console session
- **THEN** the console rejects the start and identifies the slot as occupied

#### Scenario: Plan limit reached
- **WHEN** the number of active DJ slots would exceed the plan maximum
- **THEN** the console prevents the new session and explains the limit

#### Scenario: Unexpected disconnect
- **WHEN** the browser closes the page or loses the connection without an explicit stop
- **THEN** the session is terminated within the configured grace period and the AutoDJ resumes

#### Scenario: Reconnection
- **WHEN** the transport drops but the console is still open
- **THEN** the console attempts to reconnect automatically and shows a reconnecting state until it succeeds or the user stops

### Requirement: Now-playing metadata and session history

The console SHALL report the current and next track to the system. The system SHALL update the radio's now-playing metadata and SHALL record the live session in the DJ session history, identifying it as a browser-originated session.

#### Scenario: Track change
- **WHEN** the console starts a new track
- **THEN** the radio's public now-playing information reflects the new title and artist

#### Scenario: Session history
- **WHEN** a browser live session ends
- **THEN** the history contains a closed session with slot, start, end, duration, and browser origin

### Requirement: Compatibility and operational feedback

The console SHALL report browser compatibility, unsupported audio formats, microphone permission errors, network quality, and the negotiated audio bitrate. It SHALL target a 192 kbps stream for live sessions.

#### Scenario: Unsupported audio format
- **WHEN** the user adds a file the browser cannot decode
- **THEN** the console marks it as unplayable and continues operating with the remaining library

#### Scenario: Network quality
- **WHEN** a live session is active
- **THEN** the console shows the current bitrate and connection state so the user can detect degradation

#### Scenario: Microphone permission denied
- **WHEN** the user denies microphone permission
- **THEN** the console explains how to grant it and allows music-only operation
