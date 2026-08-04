# Release Notes

## v0.26.0 — Connected Collection Foundation (2026-08-04)

- Added stable device identity, sync-ready plant metadata, a persistent collapsing change queue, and soft-delete tombstones.
- Routed plant persistence through a compatible local repository while preserving tracker, journal, photo, health, and history fields.
- Added provider-neutral conflict detection and a sync engine with retry-safe push and pull behavior.
- Added a development-only browser mirror provider that is never enabled automatically and is not cross-device storage.
- Renamed Settings → Cloud Sync to Data & Sync with honest local, pending, conflict, device, and connection status.
- Preserved manual Cloud Sync, backup, restore, import, export, localStorage compatibility, and legacy-backup migration without automatic uploads.

## v0.25.0 — Collection Control & Insights

- Correct existing Corm phase-history dates and phases without creating duplicate events.
- Duplicate a Plant into the Add Plant form while excluding identity, timestamps, photos, and historical activity.
- Review lifetime recorded Plant spending from the rearrangeable Dashboard.
- Manage user-created dropdown options and replace or clear values used by Plants and Quick Views.
- Restrict Corm and Propagation parents to eligible established Plants.
- Display documented release names in About.

The backup schema remains v4. All new persisted information already lives in the existing Plant, custom dropdown, Quick View, and Dashboard preference collections.
