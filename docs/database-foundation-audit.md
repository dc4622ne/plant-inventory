# Database Foundation Audit

## Current architecture

Plant Tracker v0.25.0 is a React 19.2 / Vite 8.1 single-page PWA. `src/App.jsx` owns most UI state and writes directly to browser storage. `src/backupUtils.js` defines backup schema v4 and the transactional restore workflow. The current source of truth is the active browser profile: structured records live in `localStorage`; photo blobs live in IndexedDB (`plant-tracker-assets/images`) and are referenced as `plant-asset://…`. Manual Cloud Sync serializes a complete v4 backup to the single `public.app_backups` row `primary`. It is not realtime sync.

The existing optional `src/supabaseClient.js` is used by manual backup and the current image uploader. It reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. No credentials are required for local operation. Vite exposes `VITE_` values to the browser, so only the public URL and anon/publishable key are acceptable.

## Storage inventory

| Key | Contents | Database direction |
| --- | --- | --- |
| `plant-inventory-plants` | Plants plus embedded lifecycle, activity, photo, timeline, TC, LECA, corm histories | `plants` plus event/photo/relationship tables |
| `plant-inventory-dropdown-options` | User and merged built-in choice arrays by field | `dropdown_options` |
| `plant-inventory-wishlist` | Wishlist/purchase/shipping/conversion records | `wishlist_items` |
| `plant-inventory-reminders` | Reminders, check-ins, completion history | `plant_check_ins` |
| `plant-inventory-garden-beds` | Beds with nested crops, activities, harvests | `garden_beds` initially; nested JSON retained pending audit |
| `plant-inventory-plant-spaces` | Spaces and nested visual placements | `plant_spaces`; placements retained as JSON pending UI split |
| `plant-inventory-quick-notes` | Plant Journal and conversion metadata | `plant_journal_entries` |
| `plant-inventory-quick-views` | Named normalized list states | `quick_views` |
| `plant-inventory-view-mode` | List display preference | local device preference |
| `plant-inventory-page-sizes` | Per-view page sizes | local device preference |
| `plant-inventory-local-meta` | Last local modification and device ID | migration/device metadata |
| `plant-inventory-client-id` | Generated browser device ID | `device_registrations` during migration |
| `plant-inventory-restore-safety-snapshot` | Last pre-restore rollback backup | remains local; future encrypted backup direction |
| `plant-inventory-quick-views-editable-migrated` | One-time local compatibility marker | remains local migration marker |
| `plant-inventory-plant-space-view-modes` | Per-device space rendering choices | remains local device preference |
| `plant-tracker-dashboard-preferences` | Version 3 card order/visibility | `dashboard_preferences` for account preference; responsive state stays local |

Unknown future `plant-inventory-*` keys are preserved in backup `extraLocalStorage`. Startup must not remove, rename, or rewrite them.

## Existing models and relationships

Plant identity currently uses string IDs generated from a prefix, timestamp, and random suffix; seeded and legacy IDs also occur. Related embedded records may have similar strings or deterministic fallback IDs. Database records need UUID primary keys while preserving every original ID in `legacy_id` for idempotent migration and duplicate detection.

Stable plant fields include `lifecycleStatus`, `origin`, `lifecycleStage`, `name`, `genus`, `imageUrl`, `type`, `source`, `location`, `status`, `attention`, care/acquisition/pot fields, quarantine dates, `doNotTouchUntil`, notes, and current TC/LECA/corm state. Existing names map to snake_case SQL columns; unclassified fields remain in `legacy_fields` rather than being discarded. `cormParentPlantId` and lifecycle history represent parent/child and state-transition relationships.

Timeline-oriented embedded arrays are `activityLog`, `photoLog`, `timelineEntries`, `lifecycleHistory`, `cormPhaseHistory`, and `cormProgressPhotos`. Check-ins are primarily in the reminders collection; Plant Journal uses quick notes. Automatic health timeline rows are derived from authoritative plant fields, activities, photos, and check-ins and must not be duplicated during migration. Event dates must remain distinct from database creation timestamps because entries can be backdated.

Wishlist items contain identity, desired status, source/price, ordering/shipping dates, tracking, notes, image, and conversion links. Garden beds contain bed fields plus flexible crops, activities, and harvests. Plant spaces contain background metadata and placement geometry. Quick Views store an entire normalized list-state object. Dropdown options are arrays keyed by application field.

## Photos

Legacy backups may contain `data:image/...`; current restore moves these bytes to IndexedDB and leaves `plant-asset://` references. Cloud/JSON export materializes them back into compatible v4 data. Some newer uploads can be Supabase Storage URLs. Base64 must never enter database rows. Future objects use `{user_id}/{plant_id}/{photo_id}.{extension}`, with metadata in `plant_photos`; uploads should be compressed before transfer. No photo migration occurs in Release E.

## Backup and restore safety

Backup schema v4 includes all registered collections, preferences, device/export metadata, and unknown prefixed keys. Restore normalizes legacy shapes, validates the whole envelope, prepares writes in memory, creates a safety snapshot, migrates embedded photos to IndexedDB, verifies writes, and rolls back exact prior values on failure. Manual cloud restore performs preview/age checks before invoking the same path. These flows remain unchanged.

## Risks and unresolved fields

- Timestamp/random string IDs can collide across imported devices; seeded Quick View IDs intentionally duplicate across installations. Migration must map legacy IDs per user and collection.
- Repeated imports, a plant converted from a wishlist item, derived timeline entries, and the same photo referenced in several records can create duplicates.
- Concurrent edits to plant fields, nested arrays, dropdown replacements, Quick Views, and placement layouts need record-level conflict handling. Event inserts should not conflict with unrelated plant edits.
- Garden crops/harvests, plant placements, reminder completion history, lifecycle transitions, and uncommon legacy fields need production-data sampling before further normalization.
- `status`, `attention`/Watch List semantics, scientific/common naming, fertilizer dates, favorites, and some legacy health fields are not consistently modeled in current records. Typed foundation columns plus `legacy_fields` avoid data loss until mapping is approved.
- Account-level versus device-only preference boundaries need product confirmation. View mode, page size, and responsive display mode should remain device-local; dashboard card choices are candidates for account sync.
- Existing public image-upload behavior and the manual `app_backups` security model are legacy systems outside this release. They remain operational but should be independently hardened/retired in Release G.
