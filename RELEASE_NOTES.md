# Release Notes

## v0.28.0 — Collection Refinement (working release)

- Manage reusable Activity Type choices and add Watered directly from Plant Detail quick actions.
- Manage reusable Growing Medium, Pot Size, and Soil Mix / Substrate Mix choices.
- Put Type/Category, Genus, and Location first in Plant List filters; add Source and Water Mix filtering.
- Present existing Watering Notes data as reusable Water Mix choices without changing its stored field.
- Hide converted Wishlist items by default while keeping Active, Converted, and All views available.
- Preserve Tissue Culture origin and lifecycle classification when converting Wishlist items into plants.
- Add a rearrangeable Wishlist Dashboard card that counts active items only.
- Replace user-facing Origin with historical Starting Stage and Acquisition Method fields while retaining the legacy Origin value internally.
- Convert normal, Tissue Culture, and Corm Wishlist items with explicit starting and current stages plus Purchased acquisition defaults.
- Add Starting Stage and Acquisition Method filters and CSV columns without removing legacy Origin compatibility.
- Add optional Species entry, identity display, Plant List search, and CSV export without deriving it from plant names.
- Open the full Plant List from the Dashboard's missing-price count with the same price compatibility rules used by spending totals.
- Keep the existing Save flow within reach on mobile through a safe-area-aware floating Save control.
- Preserve and automatically rediscover values already stored on plants and activity logs.
- Keep the existing plant and activity-log record formats and backup schema unchanged.

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
