# Plant Tracker Features

## Origins, lifecycle, Corms, and Plant Journal

- Plant Journal with unfiled/filed status, optional plant/photo, and conversion to Check-in, Activity Log, Health Timeline, Care Note, or a permanent journal entry. Existing pre-rename storage and v4 backups remain compatible.
- Distinct origin values: Purchased plant, Tissue culture, Corm, Cutting, Division, Seed, Gift, and Other.
- Independent lifecycle stages with append-only transition and correction history.
- Dedicated Corm Tracker with growth methods, custom Other descriptions, milestone-based phases and dates, chronological phase history, parent linkage, medium, progress notes/photos, and outcome.
- Multi-select category, location, growing medium, status, origin, lifecycle, and other categorical filters use OR logic within a group and AND logic across groups. Each group and the full filter set can be cleared independently.
- A compact Plant List Quick View selector applies saved configurations, shows Active/Modified state, creates a new view from the current list, and restores defaults without exposing management controls.
- Settings → Quick Views manages every saved view through edit, rename, duplicate, and confirmed delete actions. Previously built-in views migrate once into the same editable collection without duplicated IDs.
- Responsive Settings section navigation keeps Quick Views, cloud sync, backup/restore, import/export, version information, and general details directly reachable.
- Active trackers and completed historical trackers remain available from the Plant Detail section navigator.
- Backup schema v4 preserves Plant Journal entries, user Quick Views, and all additive plant history in local, JSON, restore/undo, and manual cloud-backup flows. Older backups receive an empty Quick Views collection.
