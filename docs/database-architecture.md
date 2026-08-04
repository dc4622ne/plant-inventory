# Database Architecture

Release E adds an inactive database path. Browser localStorage and the existing manual Cloud Sync remain the source of truth. Release F will preflight, back up, map stable UUIDs, upload photos, import records, review conflicts, and only then activate automatic database saving. Release G will harden offline/realtime behavior and retire manual sync after verification.

The future database-first model uses `profiles` as the auth identity; `plants` as current aggregate state; separate photo, journal, check-in, health, activity, corm, TC, and LECA event rows; relationship rows for parent/child links; and user-owned settings/collection tables. Backdated `event_at`/`event_date` is separate from `created_at`. Flexible legacy payloads are retained in narrowly scoped JSONB until their shapes are proven.

Photo bytes belong in the private `plant-photos` Storage bucket, never PostgreSQL. Paths are `{user_id}/{plant_id}/{photo_id}.{extension}`. `plant_photos` stores caption, event date, primary status, ordering, dimensions, MIME type, and legacy metadata. Clients will compress images before upload; Release E uploads nothing.

All user-owned tables have RLS. Authenticated CRUD requires `auth.uid() = user_id`; update policies include both `USING` and `WITH CHECK`. Storage policies enforce the first path folder as the user UUID. The browser receives only the project URL and public anon/publishable key. Service-role keys are forbidden.

Every mutable record has `record_version`, timestamps, and soft deletion. Versioned updates match ID, owner, and expected version atomically, increment only that record, and return a conflict when stale. Event insertion is independent from the parent plant version. Future conflict UI will compare per-record values and preserve both sides until a user chooses.

Normal repositories expose no physical delete operation. `softDelete` sets `deleted_at`, `restore` clears it through the same expected-version check, and default reads omit deleted rows; callers must explicitly request `includeDeleted` for recovery views. A future privileged purge process will run outside ordinary repositories after a documented retention period. It must verify tombstone synchronization and backup expiry, delete dependent historical rows in a controlled order, remove corresponding private Storage objects, record an audit result, and retry object/database cleanup safely. Ordinary soft deletion never deletes photo objects or historical rows.

Offline direction is an append/update queue with stable client operation IDs, per-device registration, retries, and tombstones. Realtime will be used as an invalidation/change signal, not as a substitute for durable writes. The queue and realtime subscriptions remain disabled in Release E.

Backup schema v4 stays authoritative for current local/manual workflows. Future backups should export database records plus a photo manifest, with encrypted/archive media handled separately. Migration must always create a verified local backup first and support restartable runs and rollback metadata.

The repository boundary is intentionally incremental: existing UI continues direct local operations while new local and Supabase adapters establish contracts. The same user-owned, UUID/event/storage model can later support other Gibre Platform modules without sharing plant-specific tables or weakening tenant isolation.

Supabase remains in the main browser bundle because the pre-existing manual Cloud Sync and photo uploader import the singleton during normal application startup even when the new database flags are false. Deferring it would require making those established workflows asynchronous at their import boundary. That optimization is postponed until it can be tested as a dedicated release rather than coupled to the database foundation.
