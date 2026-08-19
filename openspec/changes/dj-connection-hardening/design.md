## Context

See `proposal.md` for motivation. The DJ connection flow currently relies on Liquidsoap `input.harbor()` callbacks into the agent to maintain an in-memory `_djActive` map. The database `radio_streams.status` is derived from those callbacks, and the generated Liquidsoap script uses a single-level priority sort. The dashboard already shows role hierarchy (`owner > host > guest`) and multi-DJ slot management, but the backend does not fully honor that hierarchy. This design reconciles those layers.

## Goals / Non-Goals

**Goals:**
- Make `_djActive` reconstructible and verifiable against Liquidsoap and the database.
- Move harbor callback secrets out of URLs and process listings.
- Enforce role-based priority in the Liquidsoap fallback chain.
- Provide per-slot kick without restarting the stream.
- Add durable DJ session history and expose it in the dashboard.
- Reduce `docker exec` load from status polling.
- Make the connection UI communicate "on air" vs "standby" clearly.

**Non-Goals:**
- Redesign the auth model (OAuth, JWT per DJ, MFA).
- Real-time audio mixing of multiple DJs.
- Automatic password rotation.
- Cross-fade between DJ and AutoDJ.
- Renumbering existing `/djN` mounts when a plan changes.
- Changing the Icecast source-auth fallback path.

## Decisions

### D1: Reconstruct state from Liquidsoap telnet on startup
On startup, the agent will connect to each stream's telnet port and run `harbor.status` or `source.get` commands to list active harbor inputs. This rebuilds `_djActive` before the watcher starts.

**Why:** It avoids the current blind spot where an agent restart loses all active DJ knowledge.

**Alternative considered:** Query Icecast `/status-json.xsl` to infer live source. Rejected: Icecast only sees the final mixed output, not individual harbor slots.

### D2: Bidirectional reconciliation loop
The existing `dj-watcher.js` will be extended to compare three sources: `_djActive`, `radio_streams.status`, and the live harbor status from telnet. It will repair both stale `live` and stale `autodj` states.

**Why:** A single-direction watcher only fixes half the failure modes.

**Alternative considered:** Keep the existing one-direction watcher and rely on the startup reconstruction. Rejected: callbacks can still be lost while the agent is running.

### D3: Harbor callbacks use `X-Harbor-Token` header
The generated Liquidsoap script will use `curl -H "X-Harbor-Token: ..."` instead of `?token=...`. The agent auth hook will check this header for `/harbor/connected` and `/harbor/disconnected`.

**Why:** Query parameters appear in proxy logs, shell history, and `/proc/*/cmdline`.

**Alternative considered:** Sign the callback body with HMAC. Rejected: more complexity than needed for this iteration; header-based secret is already a major improvement.

### D4: Role-priority in two-level fallback
The generated script will group DJs by role and produce:

```liquidsoap
owners = fallback(track_sensitive=false, [owner1, owner2, ...])
hosts  = fallback(track_sensitive=false, [host1, host2, ...])
guests = fallback(track_sensitive=false, [guest1, guest2, ...])
live = fallback(track_sensitive=false, [owners, hosts, guests])
radio = fallback(track_sensitive=false, [live, autodj])
```

Inside each role, DJs are ordered by numeric priority ascending.

**Why:** It matches the UI contract without changing the database schema or the existing `priority` field semantics.

**Alternative considered:** Compute a synthetic priority score (`role * 100 + priority`) and keep a flat fallback. Rejected: unclear priority boundaries and harder to reason about.

### D5: Kick via telnet `harbor.stop`
Kicking a DJ slot will send the telnet command that Liquidsoap exposes for stopping a harbor input (e.g., `live.dj0.stop`). This terminates the TCP connection from the encoder.

**Why:** It does not require restarting the whole Liquidsoap process and leaves other DJs untouched.

**Alternative considered:** Restart Liquidsoap with a regenerated script that omits the slot. Rejected: disruptive for other DJs and listeners.

### D6: New `dj_sessions` table
Schema:

```sql
id, clientId, radioStreamId, djId, mount, role, ipAddress,
startedAt, endedAt, durationSeconds, createdAt
```

The row is created on `on_connect` and closed on `on_disconnect` or kick. A `sessionKey` composed of `clientId:mount:startedAt` avoids duplicates after agent restart.

**Why:** Provides durable audit history without complicating the hot path.

**Alternative considered:** Reuse `streaming_audit_logs`. Rejected: audit logs are append-only and not queryable by session duration.

### D7: Cache process-running checks
`isProcessRunning()` will cache results for 5 seconds per mount. The WebSocket (3s) and supervisor (60s) will read from cache, and explicit control actions will bypass cache.

**Why:** Reduces `docker exec` frequency from many per second to a handful.

**Alternative considered:** Query Docker API directly. Rejected: adds dependency; caching is simpler and sufficient.

### D8: Log tail endpoint
The agent will expose `GET /api/streams/:clientId/logs?lines=100` reading `/var/log/liquidsoap/<mount>.log`.

**Why:** Operators and clients can self-diagnose connection failures.

**Alternative considered:** Stream logs via WebSocket. Rejected: overkill for this iteration.

## Risks / Trade-offs

- **[R1] Telnet commands are implementation-specific to Liquidsoap version** → Mitigation: wrap in a helper with graceful degradation; if telnet fails, fall back to the current callback-only model and log a warning.
- **[R2] Moving callback auth to header breaks custom Liquidsoap scripts** → Mitigation: only affects auto-generated `.liq`; keep query-param auth as deprecated fallback for one release.
- **[R3] `harbor.stop` behavior may vary between Liquidsoap builds** → Mitigation: test against the pinned `savonet/liquidsoap:v2.4.5` image; document command if it changes.
- **[R4] Cache can show stale process state briefly** → Mitigation: control endpoints bypass cache; UI status can tolerate a few seconds of staleness.
- **[R5] Kick action needs clear authorization rules** → Mitigation: enforce in the agent; owner/host/guest permissions mirror UI hierarchy.

## Migration Plan

1. Add `dj_sessions` table via Prisma migration.
2. Update `radio_djs` if adding `lastSessionId` or `lastConnectedAt` columns (optional).
3. Deploy agent changes: telnet state reconstruction, header auth, role fallback, kick endpoint, log endpoint, cache.
4. Regenerate all `.liq` scripts (restart streams or call `/restart` per client).
5. Deploy panel changes: kick button, session history, log viewer, on-air/standby indicators.
6. Update environment validation to require `HARBOR_PUBLIC_HOSTNAME`.
7. Rollback: revert commits, restore previous `.liq` scripts, drop `dj_sessions` table if needed.

## Open Questions

- Should the agent expose a telnet abstraction module so future features (metadata, skip) reuse it?
- Do we want to keep the query-param callback as a deprecated fallback, or remove it immediately?
- Should `dj_sessions` include bytes transferred or other quality metrics now, or in a later change?
