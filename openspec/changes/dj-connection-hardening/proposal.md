## Why

The DJ remote connection flow works in the happy path, but it has accumulated fragility: connection state lives only in the agent's in-memory `_djActive` map, Liquidsoap callbacks authenticate via a query param that leaks into logs, and the UI promises role-based priority (`owner > host > guest`) that the generated Liquidsoap script does not actually enforce. These gaps cause stale `live`/`autodj` states after agent restarts, security exposure, and confusing multi-DJ behavior. This change hardens the DJ connection subsystem so it is recoverable, observable, and consistent with the UI contract.

## What Changes

- **Reconstruct DJ state on agent startup** by querying Liquidsoap's harbor inputs via telnet, so `_djActive` reflects reality after a restart.
- **Make the state watcher bidirectional**: detect both stale `live` rows with no active DJs and `autodj` rows with hidden connected DJs.
- **Move harbor callback authentication from query param to header** (`X-Harbor-Token`) to keep secrets out of logs and process listings.
- **Enforce role-based priority in Liquidsoap fallback**: `owner` always wins over `host`, which wins over `guest`, with a secondary numeric priority inside each role.
- **Add per-slot DJ kick** so admins/owners can force-disconnect a single DJ without restarting the whole stream.
- **Introduce a `dj_sessions` table** to record connect/disconnect history, duration, mount, role, and source IP for audit and debugging.
- **Cache process-running checks** to avoid a `docker exec` storm from the WebSocket and supervisor loops.
- **Expose recent Liquidsoap connection logs** in the dashboard so users can self-diagnose encoder issues.
- **Improve the connection UI**: distinguish "on air" from "connected but on standby", auto-assign mounts, and clarify passwords.
- **Validate `HARBOR_PUBLIC_HOSTNAME` at agent startup** and remove silent fallbacks to the panel domain.

## Capabilities

### New Capabilities
- `dj-connection/state-recovery`: Rebuild and reconcile DJ connection state between the agent, Liquidsoap, and the database across restarts and missed callbacks.
- `dj-connection/auth-headers`: Authenticate Liquidsoap harbor callbacks via HTTP headers instead of query parameters.
- `dj-connection/role-priority`: Enforce the documented role hierarchy (`owner > host > guest`) inside the Liquidsoap fallback chain.
- `dj-connection/kick`: Allow authorized users to disconnect a specific DJ slot without stopping the AutoDJ stream.
- `dj-connection/session-audit`: Persist DJ connect/disconnect events and metadata to a new `dj_sessions` table.
- `dj-connection/observability`: Surface Liquidsoap connection logs and session history in the admin and client dashboards.

### Modified Capabilities
- `multi-dj`: The existing spec declares plan-driven slot limits and independent slot tracking; it will be extended to require role-aware fallback ordering and slot-level kick semantics.

## Impact

- **Agent (Node/Fastify)**: `routes/streams.js`, `lib/dj-watcher.js`, `lib/script-generator.js`, `lib/liquidsoap.js`, `lib/auth.js`, new `lib/dj-sessions.js`.
- **Panel (Next.js)**: `app/dashboard/streaming/connection/page.tsx`, `app/api/dashboard/streaming/connection/route.ts`, `app/api/dashboard/streaming/djs/[djId]/kick/route.ts` (new), admin log viewer.
- **Database**: New `dj_sessions` table; minor updates to `radio_djs` if needed for IP/session tracking.
- **Liquidsoap scripts**: Generated `.liq` files will include role-ordered fallback and telnet metadata queries.
- **Operations**: Agent startup will fail fast if `HARBOR_PUBLIC_HOSTNAME` is missing.
