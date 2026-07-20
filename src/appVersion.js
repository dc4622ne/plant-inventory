export const currentAppVersion = {
  version: 'v0.19.1',
  buildDateTime: '2026-07-20 10:03:19 -04:00',
  releaseName: 'Compact Mobile Plant List Controls',
};

export const changelog = [
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
