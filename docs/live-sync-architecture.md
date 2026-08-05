# ADR 002: Authenticated local-first live sync

Status: Accepted for v0.27.0 (2026-08-04)

## Decision

Plant Tracker remains a standalone PWA and uses Supabase Auth, Postgres, Realtime, and private Storage behind replaceable services. This preserves a direct path to shared Gibre Platform identity and persistence later without moving the tracker into that platform now.

The mounted UI continues to use its compatible synchronous browser view, but the authoritative offline cache, outbox, conflict log, migration state, sync metadata, blobs, and photo queue are user-scoped IndexedDB. Supabase `sync_records` is the hosted record envelope. Each row has `(user_id, entity_type, entity_id)`, JSONB payload, database timestamps, revision, device ID, mutation ID, and tombstone. The mutation RPC is `SECURITY INVOKER`, checks the authenticated owner, rejects stale revisions, and returns the original result for an idempotent retry.

## Definitive persistence inventory

| Domain | Compatibility source | Sync entity | Treatment |
|---|---|---|---|
| Plants, lifecycle/archive/graveyard, favorite/watch/status fields | `plant-inventory-plants` | `plant` | One record per stable plant ID |
| Photos, timeline, health, activity, TC, LECA, Corm progress/phase histories | Nested plant arrays | Stable child IDs inside `plant` | Three-way recursive merge; child arrays merge by ID |
| Plant Journal / handwritten notes | `plant-inventory-quick-notes` | `journal_entry` | Independent records |
| Reminders and completed check-ins | `plant-inventory-reminders` | `check_in` | Independent records |
| Plant spaces and placements | `plant-inventory-plant-spaces` | `plant_space` | One record per space; placements merge by ID |
| Garden beds, crops, activities, harvests | `plant-inventory-garden-beds` | `garden_bed` | One record per bed; child arrays merge by ID |
| Wishlist | `plant-inventory-wishlist` | `wishlist_item` | Independent records |
| Quick Views | `plant-inventory-quick-views` | `quick_view` | Independent records |
| Dropdown options | `plant-inventory-dropdown-options` | `dropdown_options/singleton` | User-scoped singleton |
| Dashboard layout | `plant-tracker-dashboard-preferences` | `dashboard_preferences/singleton` | User-scoped singleton |
| Image binaries | `plant-tracker-assets/images`, legacy data URLs | Storage plus `imageBlobs` | Private upload and offline cache |
| Outbox, conflicts, migration, status | Legacy sync localStorage keys | IndexedDB stores | Versioned, idempotent import; obsolete keys removed after import |
| Restore safety snapshot | `plant-inventory-restore-safety-snapshot` | Local safety artifact | Retained independently from live sync |
| View mode, page size, device ID, space display modes, session sort | local/session storage | None | Explicitly device-specific UI preferences |

Resources are static application content and have no user persistence. Backup schema v4 covers the eight collection fields plus preferences and compatible extra `plant-inventory-*` values. JSON restore validates, previews, snapshots, writes, verifies, and rolls back. CSV remains an export format.

## IndexedDB schema

Database: `plant-tracker-live-sync`, version 1.

- `records`: key `[userId, entityType, entityId]`; cached record, server base, revision, local/server timestamps, tombstone.
- `mutations`: key `[userId, id]`; indexed by user/state and user/entity; operation, base revision/record, payload, attempts, failure class, retry time, lease.
- `conflicts`: key `[userId, id]`; field path, three values, devices/timestamps, resolution lifecycle.
- `migrationRuns`: key `[userId, version]`; snapshot, counts, reconciliation and verification report.
- `syncMetadata`: key `[userId, key]`; last reconciliation/success, realtime state, error and migration version.
- `imageBlobs`: key `[userId, id]`; offline/migration source blob and content hash.
- `imageUploadQueue`: key `[userId, id]`; private path, metadata, attempts, lease and state.

Compound keys prevent a query for one account from returning another account’s entries. Logout clears the synchronous compatibility view, closes subscriptions/timers and the open database connection, but retains the signed-out account’s namespace. An explicit Settings action removes only that namespace after confirmation.

## Mutation lifecycle

Local changes are detected immediately for plants and by a lightweight visible-page collection scanner for remaining compatibility writers. The coordinator compacts repeated changes to the same entity into one mutation while retaining the original base. States are `pending`, `processing`, `retryable`, `blocked_conflict`, and `failed_permanent`; acknowledgment removes the mutation. A 30-second processing lease makes crashes recoverable. Network/server failures use bounded exponential backoff up to five minutes. Authentication, authorization, and invalid-payload failures are permanent and require attention.

Stable client IDs allow parents and children to be created offline without server-generated identity dependencies. Deletes become tombstones. A pending create followed by deletion is represented by the final tombstone envelope; updates never jump ahead of an earlier mutation because compaction keeps one ordered entity mutation.

## Three-way merge and conflicts

For each field, base/local/remote are compared: unchanged local accepts remote; unchanged remote accepts local; identical concurrent values are accepted; divergent concurrent values create a conflict. Plain objects recurse. Arrays with stable child IDs merge by ID, so independent history appends survive; the same child then merges field-by-field. Arrays without stable identity are selected as a whole and never index-merged. Update/delete collisions conflict; matching deletes converge.

Conflicts persist with account, entity, label, field path, base/local/remote values, device IDs and timestamps. Conflict Review offers this device, other device, manual text combination, or resolve later. Resolution edits the blocked mutation and remains `resolution_pending` until its revision-aware server acknowledgment; only then is it marked resolved.

## Image pipeline

The private `plant-photos` bucket uses paths `<userId>/<parent-or-domain>/<photoId>/<photoId>.<ext>`. RLS requires the authenticated user ID as the first folder for read, insert, update/upsert, and delete. Upload preparation enforces supported types and resizes large decodable images. SHA-256 hashes prevent repeat uploads. Offline blobs and retries live in separate IndexedDB stores. Rendering uses short-lived signed URLs, local object URLs while pending, existing lazy image markup, and the existing placeholder behavior.

Legacy data URLs and `plant-asset://` references are traversed independently after the structured collection is safe. The source is copied to `imageBlobs`, hashed, uploaded, verified through signed access, and then replaced by `supabase-image://<path>`. Failed uploads retain the local blob and pending reference and do not block structured migration.

## Migration and recovery

Migration version 2 creates one immutable safety snapshot, inventories local counts, claims legacy data for only one account, compares stable entity IDs, uploads local-only records, downloads cloud-only records, and imports legacy queue/conflict/status state idempotently. Verification checks duplicate keys, parent references, pending/permanent mutations, conflicts, and photo queues before completion. Interrupted processing resumes from IndexedDB leases and acknowledged mutations are not recreated.

Realtime starts only after authentication/cache hydration, is filtered to `user_id`, and is removed on teardown. Soft deletes arrive as updates, avoiding unfilterable Realtime DELETE payloads. The 60-second reconciliation remains the recovery path for missed events.
