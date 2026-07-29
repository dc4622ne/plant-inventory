# Plant Tracker Features

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
- Responsive Settings section navigation keeps Quick Views, cloud sync, backup/restore, import/export, version information, and general details directly reachable.
- Active trackers and completed historical trackers remain available from the Plant Detail section navigator.
- Backup schema v4 preserves Plant Journal entries, user Quick Views, and all additive plant history in local, JSON, restore/undo, and manual cloud-backup flows. Older backups receive an empty Quick Views collection.
