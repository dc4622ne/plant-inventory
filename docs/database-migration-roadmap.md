# Database Migration Roadmap

## Release E — Database Foundation (v0.26.0)

Adds the disabled client, flags, repository/auth/diagnostics foundations, schema, RLS, private photo storage design, schema metadata, and optimistic concurrency. It does not create accounts for users, upload photos, import records, alter local keys, or make Supabase the active source of truth.

## Release F — Migration and Automatic Saving

Add opt-in authentication and a preflight that inventories/backs up local data. Create stable UUID mappings, detect duplicates, upload compressed photos, import in restartable batches, show conflicts, verify counts/checksums, then explicitly switch an approved user to database-first saving. Add an offline operation queue and safe retry/idempotency behavior. Keep rollback available until verification completes.

## Release G — Sync Retirement and Hardening

Prove cross-device convergence, realtime invalidation, offline recovery, tombstone retention, media cleanup, export/restore, monitoring, and account deletion. Only after adoption and rollback criteria pass should the legacy manual Push/Restore Cloud Sync system be retired. Preserve downloadable backups and a documented recovery path.
