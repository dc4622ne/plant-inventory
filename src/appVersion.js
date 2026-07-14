export const currentAppVersion = {
  version: 'v0.11.0',
  buildDateTime: '2026-07-14 15:24:25 -04:00',
  releaseName: 'Settings version and changelog',
};

export const changelog = [
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
