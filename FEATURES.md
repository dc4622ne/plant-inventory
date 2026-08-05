# Plant Tracker Features

## v0.27.0 — Connected Collection: Live Sync

- Email/password sign-up, sign-in, persistent session restoration, sign-out, and password-reset entry point.
- User-owned Supabase records protected by Row Level Security and composite identity `(user_id, entity_type, entity_id)`.
- Immediate local edits with a persistent, collapsing mutation queue, automatic reconnect/focus/periodic retry, and realtime reconciliation.
- Idempotent mutation IDs, soft-delete tombstones, revision checks, and retained conflict diagnostics.
- Resumable first-connection preparation with a local safety snapshot and stable-ID comparison.
- Calm, safe-area-aware authentication and compact Account & Live Sync status in Settings.
- User-scoped IndexedDB cache, leased outbox, conflict/migration metadata, offline image blobs, and independent photo upload queue.
- Live synchronization for plants, journal, check-ins, spaces, garden, wishlist, Quick Views, dropdowns, and dashboard preferences.
- Recursive three-way merge with stable-ID history merging and an iPhone-ready Conflict Review workflow.
- Private Supabase Storage paths, content-hash deduplication, signed image access, and resumable legacy-image migration.
- Independent JSON/CSV backup and restore workflows retained; manual cloud snapshots are labeled emergency recovery.

## v0.26.0 — Connected Collection Foundation (Release F)

- Plant records receive stable IDs and additive sync metadata while preserving every existing field and timestamp.
- A stable, editable local device identity identifies future changes without connecting a live provider.
- A persistent, collapsing outbox records local creates, edits, and soft-delete tombstones for future delivery.
- The local plant repository is the preferred persistence boundary and keeps `plant-inventory-plants` compatible with existing browser data.
- Provider-neutral conflict detection preserves simultaneous edits and delete/update conflicts instead of overwriting either side.
- A provider-neutral sync engine and separate development-only local mirror validate push, pull, retry, status, and conflict behavior; the mirror is never enabled automatically.
- Data & Sync shows honest local storage, pending-change, conflict, device, and connection status. It does not claim data is synced without a completed provider run.
- Current backups retain metadata and tombstones; legacy backups gain missing IDs and metadata when first loaded without generating migration-only outgoing changes.
- Manual Cloud Sync, backup, restore, import, export, IndexedDB photos, and all existing tracker workflows remain available. No automatic production upload is enabled.

## Collection Control & Insights

- Existing Corm phase-history entries can be corrected in place and are re-sorted chronologically.
- Plant Detail can open a reviewable duplicate draft with reusable setup fields but no identity, primary photo, timestamps, or historical activity.
- The customizable Dashboard includes lifetime recorded spending with priced and unpriced plant counts.
- Settings manages user-created dropdown choices while protecting built-ins and migrating plant and Quick View references during replace-or-clear deletion.
- Corm and Propagation parent selectors centralize eligibility and exclude Corm, Tissue Culture, and the current plant.
- About displays documented release names beside their versions and gracefully leaves older unnamed history intact.

## Plant Detail UX Overhaul and Interface Consistency

- Compact responsive Plant Detail rows retain every populated field, tracker, action, and history record.
- A polished, compact, safe-area-aware floating navigator is mounted globally across primary screens, coordinates with return-to-top, and adds Edit This Plant only on Plant Detail.
- Plant Journal entries support backward-compatible in-place editing with original timestamps and conversion metadata preserved.
- About owns centralized version and release history information; Settings remains focused on preferences and data tools.
- Dashboard customization appears after every card, and the Dashboard begins directly with useful actions.
- Unordered categorical choices use shared, stable, non-mutating alphabetical ordering; lifecycle, severity, chronological, and tracker progression lists retain their meaningful order.

## Smart Home Dashboard

- Mobile-first two-column daily overview with wider cards for attention, activity, and statistics.
- Existing data powers Needs Attention, Check-ins, Quarantine, Recently Added, Watch List, Tissue Culture, LECA, Corm, journal, activity, restored Plant Insights charts, and collection summaries.
- Cards navigate to existing filtered lists and tracker destinations rather than duplicating app sections.
- Add New Plant and New Journal Entry stay visible as primary Dashboard actions.
- Dashboard sections can be shown, hidden, and reordered with accessible buttons. Versioned local preferences safely accept new or restored cards and ignore outdated IDs.
- Filtered Plant Lists preserve criteria and result counts while opening with the filter panel collapsed.
- Plant Insights charts cover Type/Category, Growing Medium, Current Lifecycle Phase, LECA Status, Tissue Culture Stages, and Corm Progress using current tracker-aware values and one count per active plant.

## Mobile Polish and Corrections

- Safe-area-aware mobile navigation, dialogs, floating controls, and page edges.
- Save and Add resets and returns to the beginning of the Add Plant workflow.
- Reliable custom substrate values, backdated Corm phases, return-to-top control, photo enlargement, and concise populated-only Plant Details.

## Origins, lifecycle, Corms, and Plant Journal

- Plant Journal with unfiled/filed status, optional plant/photo, and conversion to Check-in, Activity Log, Health Timeline, Care Note, or a permanent journal entry. Existing pre-rename storage and v4 backups remain compatible.
- Distinct origin values: Purchased plant, Tissue culture, Corm, Cutting, Division, Seed, Gift, and Other.
- Independent lifecycle stages with append-only transition and correction history.
- Dedicated Corm Tracker with growth methods, custom Other descriptions, milestone-based phases and dates, chronological phase history, parent linkage, medium, progress notes/photos, and outcome.
- Multi-select category, location, growing medium, status, origin, lifecycle, and other categorical filters use OR logic within a group and AND logic across groups. Each group and the full filter set can be cleared independently.
- A compact Plant List Quick View selector applies saved configurations, shows Active/Modified state, creates a new view from the current list, and restores defaults without exposing management controls.
- Settings → Quick Views manages every saved view through edit, rename, duplicate, and confirmed delete actions. Previously built-in views migrate once into the same editable collection without duplicated IDs.
- Settings opens with Cloud Sync first and always expanded; every remaining Settings area expands independently. Informational General details now live under About alongside release and version information.
- Responsive Settings section navigation keeps Quick Views, cloud sync, backup/restore, import/export, version information, and general details directly reachable.
- Active trackers and completed historical trackers remain available from the Plant Detail section navigator.
- Backup schema v4 preserves Plant Journal entries, user Quick Views, and all additive plant history in local, JSON, restore/undo, and manual cloud-backup flows. Older backups receive an empty Quick Views collection.
