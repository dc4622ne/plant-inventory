# Release Notes

## v0.26.0 — Database Foundation (2026-08-04)

- Added database, authentication, data-access, diagnostics, and private photo-storage foundations.
- Added version-controlled schema migrations, per-user row-level security, schema metadata, and optimistic record concurrency.
- Supabase database, authentication, and realtime functionality remain disabled by default.
- The current local/manual-sync system remains active; no existing user data is migrated or modified.
- Release F will introduce reviewed migration and automatic multi-device saving. This release does not claim automatic sync.

## v0.25.0 — Collection Control & Insights

- Correct existing Corm phase-history dates and phases without creating duplicate events.
- Duplicate a Plant into the Add Plant form while excluding identity, timestamps, photos, and historical activity.
- Review lifetime recorded Plant spending from the rearrangeable Dashboard.
- Manage user-created dropdown options and replace or clear values used by Plants and Quick Views.
- Restrict Corm and Propagation parents to eligible established Plants.
- Display documented release names in About.

The backup schema remains v4. All new persisted information already lives in the existing Plant, custom dropdown, Quick View, and Dashboard preference collections.
