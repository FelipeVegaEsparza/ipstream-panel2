## 1. Database & Schema

- [x] 1.1 Add `dj_sessions` table to Prisma schema with fields: id, clientId, radioStreamId, djId, mount, role, ipAddress, startedAt, endedAt, durationSeconds.
- [x] 1.2 Add optional `lastSessionId` to `radio_djs` if needed for quick "last connected" lookup. *(skipped — not needed)*
- [ ] 1.3 Generate and run Prisma migration for the new table and indexes. *(run `prisma migrate deploy` in target environment)*

## 2. Agent Core: State Recovery

- [x] 2.1 Create `lib/liquidsoap-telnet.js` with helper to connect to a stream's telnet port and run commands.
- [x] 2.2 Implement `getHarborActiveMounts(clientId)` that parses telnet output into a list of connected mounts.
- [x] 2.3 On agent startup, iterate running streams and rebuild `_djActive` from telnet before starting watchers.
- [x] 2.4 Extend `dj-watcher.js` to fetch live harbor state and reconcile against `_djActive` and `radio_streams.status` in both directions.
- [ ] 2.5 Write tests or manual verification steps for restart-while-DJ-connected scenario.

## 3. Agent Auth: Harbor Callback Headers

- [x] 3.1 Update `lib/auth.js` to accept `X-Harbor-Token` header for `/harbor/connected` and `/harbor/disconnected`.
- [x] 3.2 Keep deprecated `?token=` support for one release cycle, logging a warning when used.
- [x] 3.3 Update `lib/script-generator.js` to emit `curl -H "X-Harbor-Token: ..."` without token in URL.
- [x] 3.4 Verify generated `.liq` files contain no secret in query params.

## 4. Agent Multi-DJ: Role Priority & Kick

- [x] 4.1 Update `lib/script-generator.js` to group harbor inputs by role and emit two-level fallback chain.
- [x] 4.2 Add `POST /api/streams/:clientId/djs/:djId/kick` endpoint in `routes/streams.js`.
- [x] 4.3 Implement kick via telnet `harbor.stop` for the target slot; verify fallback moves to next active source.
- [x] 4.4 Enforce authorization in kick endpoint: owners and admins can kick anyone; hosts can kick guests only. *(enforced in Panel; agent trusts panel token)*
- [ ] 4.5 Regenerate and restart all client scripts to apply role-based fallback.

## 5. Agent Session Audit

- [x] 5.1 Create `lib/dj-sessions.js` with `startSession`, `endSession`, and `findActiveSession` helpers.
- [x] 5.2 Call `startSession` from `/harbor/connected` callback and `endSession` from `/harbor/disconnected` and kick.
- [x] 5.3 Add `GET /api/streams/:clientId/dj-sessions` endpoint with pagination.
- [x] 5.4 Add `dj_kicked` audit log entries in `streaming_audit_logs`.

## 6. Agent Observability & Performance

- [x] 6.1 Add a 5-second in-memory cache for `isProcessRunning` with cache-bypass flag for control actions.
- [x] 6.2 Add `GET /api/streams/:clientId/logs?lines=100` endpoint reading `/var/log/liquidsoap/<mount>.log`.
- [x] 6.3 Validate `HARBOR_PUBLIC_HOSTNAME` is set at agent startup; fail fast if missing.

## 7. Panel API

- [x] 7.1 Add `/api/dashboard/streaming/djs/[djId]/kick/route.ts` proxying to agent kick endpoint.
- [x] 7.2 Extend `/api/dashboard/streaming/connection` to include session history and log tail.
- [x] 7.3 Update `lib/streaming-client.ts` with new agent methods: `kickDj`, `getDjSessions`, `getLogs`.

## 8. Panel UI

- [x] 8.1 Update `app/dashboard/streaming/connection/page.tsx` to show "On air" vs "Connected — standby" badges.
- [x] 8.2 Add kick button per slot with role-based visibility.
- [x] 8.3 Replace oversized mount dropdown with numeric input constrained by `planMaxDjs` and available mounts.
- [x] 8.4 Add "Recent sessions" section with start time, duration, and mount.
- [x] 8.5 Add "View connection logs" button that fetches and displays the last 100 lines of Liquidsoap logs.

## 9. Deployment & Validation

- [x] 9.1 Update `.env.example` and deployment docs to mark `HARBOR_PUBLIC_HOSTNAME` as required.
- [ ] 9.2 Run `prisma migrate deploy` in staging.
- [ ] 9.3 Restart all radio streams to regenerate `.liq` scripts with new callback and fallback format.
- [ ] 9.4 Validate multi-DJ scenarios: owner preempts host, host preempts guest, kick works, restart preserves state.
- [x] 9.5 Run `openspec validate` and `openspec status` to confirm planning is complete.
