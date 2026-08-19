# DJ Role Priority Specification

## Purpose

Make the Liquidsoap fallback chain honor the role hierarchy that the dashboard already displays, so owner DJs always preempt hosts and hosts always preempt guests.

## Requirements

### Requirement: Role hierarchy determines fallback order
The generated Liquidsoap script SHALL order harbor inputs first by role (`owner` before `host` before `guest`) and then by numeric priority ascending within the same role.

#### Scenario: Owner and guest connect simultaneously
- **WHEN** a guest DJ connects and then an owner DJ connects
- **THEN** the broadcast switches to the owner and the guest remains connected but silent

#### Scenario: Host and guest connect simultaneously
- **WHEN** a guest DJ is on air and a host DJ connects
- **THEN** the broadcast switches to the host

### Requirement: Numeric priority only breaks ties within the same role
The numeric `priority` field SHALL only affect ordering among DJs with the same role.

#### Scenario: Two owners connect
- **WHEN** two owners are connected with priorities 2 and 1
- **THEN** the owner with priority 1 is on air

### Requirement: Dashboard order matches Liquidsoap order
The dashboard SHALL display connected DJs using the same ordering as the Liquidsoap fallback chain.

#### Scenario: Three DJs with mixed roles connect
- **WHEN** one owner, one host, and one guest are connected
- **THEN** the dashboard lists them in order owner, host, guest, regardless of their numeric priority values
