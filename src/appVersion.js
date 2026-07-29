export const currentAppVersion = {
  version: 'v0.25.0',
  buildDateTime: '2026-07-29',
  releaseName: 'Collection Control & Insights',
};

export const changelog = [
  {
    version: 'v0.25.0',
    releaseName: 'Collection Control & Insights',
    releaseDate: '2026-07-29',
    changes: [
      'Added in-place Corm phase-history correction with chronological re-sorting.',
      'Added safe Plant duplication drafts that copy reusable profile setup without identity, photos, or historical activity.',
      'Added lifetime recorded plant spending to the rearrangeable Dashboard.',
      'Added protected built-in and replace-or-clear management for user-created dropdown options.',
      'Restricted Corm and Propagation parent choices to eligible established plants.',
      'Added documented release names to Release History.',
    ],
  },
  {
    version: 'v0.24.0',
    releaseName: 'Plant Detail UX Overhaul and Interface Consistency',
    releaseDate: '2026-07-29',
    changes: [
      'Condensed populated Plant Detail fields into responsive rows with clearer section hierarchy.',
      'Added polished, compact, safe-area-aware floating navigation across every primary application screen.',
      'Added in-place Plant Journal editing with preserved creation and conversion metadata.',
      'Moved release information and history from Settings into a dedicated About area.',
      'Moved Dashboard customization after all cards and removed the visual introduction.',
      'Alphabetized unordered categorical choices while retaining workflow and progression order.',
    ],
  },
  {
    version: 'v0.23.0',
    releaseName: 'Smart Home Dashboard',
    releaseDate: '2026-07-29',
    changes: [
      'Rebuilt Dashboard as a mobile-first daily home screen with concise, data-backed cards.',
      'Added Needs Attention, Recently Added, Watch List, Tissue Culture, LECA, Corm, activity, journal, and statistics summaries.',
      'Restored Quarantine, Check-ins, Plant Insights charts, Add Plant, and New Journal Entry on the home screen.',
      'Expanded Plant Insights to type, growing medium, current lifecycle phase, LECA status, Tissue Culture stages, and corm progress.',
      'Kept Plant List filters collapsed when opening filtered lists while preserving active criteria and counts.',
      'Added accessible Dashboard show, hide, move, and Restore Default controls.',
      'Persisted versioned Dashboard preferences with safe normalization for new, missing, or outdated cards.',
    ],
  },
  {
    version: 'v0.22.0',
    releaseName: 'Mobile Polish and Corrections',
    releaseDate: '2026-07-29',
    changes: [
      'Improved iPhone safe-area spacing for sticky controls, dialogs, and floating actions.',
      'Reset and returned Save and Add to the top of a ready Add Plant form.',
      'Fixed custom Soil Mix / Substrate values across add, edit, display, and backup workflows.',
      'Added backdated Corm phase entries with date validation and chronological history.',
      'Added an accessible return-to-top control and enlarged Plant Details photo viewer.',
      'Removed blank optional rows and sections from Plant Details while preserving zero and false values.',
    ],
  },
  {
    version: 'v0.21.2',
    releaseDate: '2026-07-28',
    changes: [
      'Migrated legacy base64 photos from localStorage into IndexedDB before structured restore.',
      'Kept v4 cloud and downloaded backups compatible by materializing local photo assets when exporting or saving to cloud.',
      'Added privacy-safe storage diagnostics with the failing key and aggregate payload, existing-storage, and collection sizes.',
      'Kept exact structured-data rollback while making restored plant records independent of the localStorage photo quota.',
    ],
  },
  {
    version: 'v0.21.1',
    releaseDate: '2026-07-28',
    changes: [
      'Fixed cloud restore failures caused by temporary local-storage duplication in installed iPhone and iPad web apps.',
      'Made restore writes transactional with pre-serialization, exact rollback, read-back verification, and phase-specific error references.',
      'Added privacy-safe structured diagnostics for cloud download, normalization, validation, snapshot, write, verification, rollback, and completion.',
      'Updated the service worker so installed apps check for a fresh app shell and activate deployed updates promptly.',
    ],
  },
  {
    version: 'v0.21.0',
    releaseName: 'Origins, Corms & Plant Journal',
    releaseDate: '2026-07-26',
    changes: [
      'Added Plant Journal with optional plant and photo association plus safe filing and conversion workflows.',
      'Separated permanent plant origin from the current lifecycle stage with backward-compatible normalization.',
      'Added a dedicated, directly editable Corm Tracker with milestone notes and progress photos.',
      'Added lifecycle transition and correction history without changing plant IDs or removing tracker records.',
      'Kept completed Tissue Culture, Corm, and LECA trackers visible as historical records.',
      'Expanded JSON backup, restore, safety snapshots, and cloud backup serialization to include Plant Journal entries using the compatible pre-rename data collection.',
      'Added Corm growth methods, milestone-based phases, phase history, and expanded milestone dates.',
      'Made every categorical Plant List filter multi-select with OR matching within groups and AND matching across groups.',
      'Added a compact Plant List Quick View selector with explicit create, apply, modified-state, reapply, and Restore Default workflows.',
      'Moved Quick View editing, renaming, duplication, and confirmed deletion into a dedicated Settings section.',
      'Normalized previously seeded or built-in views into the same editable collection while preserving IDs and criteria.',
      'Added responsive Settings section navigation for Quick Views, cloud sync, backup/restore, import/export, version, and general information.',
      'Registered Quick Views in local storage and backup schema v4 with safe legacy and malformed-data normalization.',
    ],
  },
  {
    version: 'v0.20.0',
    releaseDate: '2026-07-24',
    changes: [
      'Tissue Culture Acclimation can now be updated directly from Plant Details.',
      'LECA Conversion can now be updated directly from Plant Details.',
      'Added a Plant Detail section navigator for faster access to tracking areas.',
      'Standardized Health, Check-ins, Tissue Culture, LECA, Photos, and Activity with a consistent section-card layout.',
      'Improved the Plant Detail experience across mobile and desktop layouts.',
    ],
  },
  {
    version: 'v0.19.1',
    releaseDate: '2026-07-20',
    changes: [
      'Compacted the mobile Plant List controls so results and plant cards appear higher on the page.',
      'Placed Sort beside a concise Filters button with an active-filter count.',
      'Placed the existing view selector beside the Plants per page control on phones.',
      'Reduced mobile Quick Views, control, filter, and result spacing while preserving accessible touch targets.',
      'Kept expanded filter fields full-width and preserved desktop and tablet layouts without horizontal overflow.',
    ],
  },
  {
    version: 'v0.19.0',
    releaseDate: '2026-07-20',
    changes: [
      'Made the Plant List default to alphabetical A–Z order.',
      'Added 11 Plant List sort options for names, acquisition and creation dates, care priority, check-ins, location, category, and genus.',
      'Preserved the selected Plant List sort for the current app session.',
      'Handled missing and duplicate sort values safely without changing stored plant order.',
      'Added creation timestamps to newly added plants to support Recently added sorting.',
      'Verified the sorting controls and layouts on desktop, tablet, and mobile.',
    ],
  },
  {
    version: 'v0.18.3',
    releaseDate: '2026-07-15',
    changes: [
      'Added smart Plant Space tile display modes with Auto, Compact Label, Photo Card, and Full Card options.',
      'Added compact Fit Wall labels for readable phone layouts.',
      'Kept Full Card tiles in Actual Size / Pan and Edit Layout modes.',
      'Added placement-level display overrides and a space-level default display mode.',
    ],
  },
  {
    version: 'v0.18.2',
    releaseDate: '2026-07-15',
    changes: [
      'Added full-wall Fit Wall mode on phones so the Plant Wall width is visible in portrait.',
      'Improved portrait canvas scaling while preserving percentage-based plant placements.',
      'Fixed Plant Space tile photos on landscape phones by applying mobile image sizing to coarse-pointer devices.',
      'Improved orientation handling so the rendered wall recalculates after phone rotation.',
      'Collapsed the Plant Wall background editor behind a Change Background control after a background is saved.',
    ],
  },
  {
    version: 'v0.18.1',
    releaseDate: '2026-07-15',
    changes: [
      'Fixed Plant Space tile photos disappearing on mobile by giving tile image containers an explicit responsive height.',
    ],
  },
  {
    version: 'v0.18.0',
    releaseDate: '2026-07-15',
    changes: [
      'Added a new Plant Spaces section with the first default Plant Wall space.',
      'Added an interactive Plant Wall canvas with view and edit layout modes.',
      'Added Plant Wall background photo support with dimming controls.',
      'Added drag-and-drop plant placement with resize, bring-forward, remove, and keyboard nudge controls.',
      'Added Find in Plant Space from plant details and Plant Wall search highlighting.',
      'Added Location syncing between the Plant Wall space and the existing Location field.',
      'Included Plant Spaces and placements in JSON, local, cloud, restore, and safety-snapshot backups.',
    ],
  },
  {
    version: 'v0.17.2',
    releaseDate: '2026-07-15',
    changes: [
      'Made the Settings changelog collapsed by default with an accessible Show Changelog control.',
      'Kept the current App Version card, release summary, update check, and compact version footer visible.',
    ],
  },
  {
    version: 'v0.17.1',
    releaseDate: '2026-07-15',
    changes: [
      'Added a centralized backup schema audit for all registered data collections.',
      'Added safer restore validation with a local safety snapshot and undo restore.',
      'Added cloud backup status, preview, and older-backup conflict warnings.',
      'Kept reminders, completed check-ins, manual timeline entries, and custom dropdown values in complete backups.',
    ],
  },
  {
    version: 'v0.17.0',
    releaseDate: '2026-07-15',
    changes: [
      'Added an automatic Plant Health Timeline to plant details.',
      'Integrated existing activity, photo log, check-in, tracker, and dated plant history.',
      'Added manual timeline entries with optional timeline photos.',
      'Added timeline filters, text search, summary counts, and sort controls.',
      'Added in-app before/after photo comparison for plant progress photos.',
    ],
  },
  {
    version: 'v0.16.0',
    releaseDate: '2026-07-15',
    changes: [
      'Added automatic quarantine and TC check-ins for time-sensitive plant stages.',
      'Added manual reminders from plant details.',
      'Added due now, upcoming, no-date, and recently completed reminder views.',
      'Added reminder actions, snoozing, next check dates, and observation notes.',
    ],
  },
  {
    version: 'v0.15.1',
    releaseDate: '2026-07-15',
    changes: [
      'Improved mobile header spacing by applying safe-area padding only once.',
      'Tightened Plant List navigation, Quick Views, and Filters spacing on phones.',
    ],
  },
  {
    version: 'v0.15.0',
    releaseDate: '2026-07-15',
    changes: [
      'Added a compact mobile Plant List layout.',
      'Made Quick Views and Filters collapsible on mobile.',
      'Reduced mobile plant card height and spacing.',
      'Improved iPhone safe-area handling for header and navigation spacing.',
      'Made mobile view and pagination controls more compact.',
    ],
  },
  {
    version: 'v0.14.0',
    releaseDate: '2026-07-14',
    changes: [
      'Connected the Soil Mix Guide to plant add and edit forms.',
      'Moved guide-based soil mix dropdown options to shared Resources data.',
      'Added direct View recipe links from plant details into the in-app Soil Mix Guide.',
      'Added support for custom soil mixes alongside guide recipes.',
    ],
  },
  {
    version: 'v0.13.0',
    releaseDate: '2026-07-14',
    changes: [
      'Added a new Resources section for native plant-care reference content.',
      'Added the Rooted with Gibre Houseplant Soil Mix Guide inside the app.',
      'Added soil mix search, plant match search, and category filters.',
      'Added expandable, mobile-friendly guide sections with Expand All and Collapse All controls.',
    ],
  },
  {
    version: 'v0.12.0',
    releaseDate: '2026-07-14',
    changes: [
      'Added full wishlist card detail views.',
      'Fixed Plant Photo Log image uploads.',
      'Fixed Garden crop image uploads.',
      'Fixed Garden bed image uploads.',
    ],
  },
  {
    version: 'v0.11.0',
    releaseDate: '2026-07-14',
    changes: [
      'Added visible Settings app version details.',
      'Added a reverse chronological changelog.',
      'Added a cache-bypassing update check that preserves user data.',
    ],
  },
  {
    version: 'v0.10.2',
    releaseDate: '2026-07-14',
    changes: [
      'Fixed wishlist photo uploads.',
      'Kept wishlist item saves from losing uploaded photo URLs.',
    ],
  },
  {
    version: 'v0.10.1',
    releaseDate: '2026-07-14',
    changes: [
      'Fixed mobile plant photo uploads.',
      'Improved mobile image handling before storage upload.',
    ],
  },
  {
    version: 'v0.10.0',
    releaseDate: '2026-07-06',
    changes: [
      'Added manual Supabase cloud sync.',
      'Added cloud backup status, save, and restore tools.',
    ],
  },
];
