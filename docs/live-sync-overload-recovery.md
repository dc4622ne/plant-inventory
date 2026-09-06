# Live-sync overload recovery

Plant Tracker owns retry behavior centrally. Supabase JS PostgREST automatic retries are disabled, sync and image work are single-flight, retry delays use exponential backoff with jitter (5 seconds to 5 minutes), and three consecutive infrastructure failures open the circuit. An open circuit pauses automatic cloud work for at least 60 seconds and permits only one manual probe.

## Expected request budget

- Hydration and compatibility serialization: zero network requests.
- Realtime: one channel per authenticated runtime. Token refresh reauthorizes that channel and does not subscribe again.
- One quiet minute: at most one periodic reconciliation query, plus the persistent Realtime connection.
- One changed record: one record preflight, one mutation RPC, and one reconciliation query.
- One queued image: one upload, one verification URL, and one metadata upsert.
- Focus, visibility, online, timer, realtime echo, and repeated Sync now signals are coalesced while a run is active. At most one follow-up run is retained.

## Staging safe mode

Set `VITE_SYNC_SAFE_MODE=true` for an emergency preview. Local IndexedDB hydration and local edits remain available, Realtime may connect, but automatic reconciliation, mutation upload, and image processing are paused. **Sync now** is the only controlled cloud probe. The diagnostics panel shows the circuit state, next probe time, active channel/timer counts, overlaps prevented, and per-operation request counts for the last minute.

## Recovery procedure after database overload

1. Keep staging clients closed until the database is responsive.
2. Deploy a preview with safe mode enabled. Do not open multiple tabs or devices.
3. Open one client and confirm: one active channel, one active sync timer, circuit `closed` or `open`, and zero unexpected hydration requests.
4. Press **Sync now** once. Do not repeat while a run is active; repeated presses join the same run.
5. If PGRST002, PGRST003, 429, or 5xx recurs, leave the circuit open and investigate the hosted database before another probe.
6. Once one probe succeeds and the request rate remains within budget, disable safe mode on a later preview and retest one trigger at a time.

Database administrators may inspect `pg_stat_activity`, PostgREST/database logs, and `pg_stat_statements` to identify expensive or repeated statements. Resetting statement statistics is optional and destructive to diagnostic history; if explicitly approved, the SQL is `select pg_stat_statements_reset();`. This application never runs that statement automatically.
