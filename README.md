# Plant Tracker

A mobile-friendly React app for tracking plants, care activity, wishlists, purchases, and garden beds. Data stays in the current browser using local storage.

## Run locally

Install dependencies with `npm install`, then start the development app with `npm run dev`.

## Supabase manual cloud backup setup

Local browser storage remains the app's main working storage. Supabase holds one manual backup record; the app does not auto-sync.

Check-ins, reminders, and manual plant timeline entries are included in the same JSON backup record as plants, wishlist items, and garden beds. No separate reminders or timeline table is required for the current offline-first/manual-sync architecture.

## Plant Health Timeline data

Each plant can store optional manual timeline records in `timelineEntries`. Automatic timeline rows are derived at view time from existing authoritative records: plant Activity Log entries, Plant Photo Log entries, check-ins/reminders, and dated plant detail fields such as repot, watering, quarantine, TC acclimation, and LECA transition dates. Derived rows are not duplicated into backup because their source records are already backed up.

The shared timeline type labels, icons, filters, source labels, and derivation rules live in `src/timeline.js`. Duplicate automatic rows are prevented with source/sourceId keys when present, falling back to deterministic plant/date/type/title/note/photo keys for older records.

## Supabase plant image storage setup

Photos chosen in the Add New Plant form upload to Supabase Storage before the plant is saved locally. The app currently has no sign-in flow, so it uses Supabase's `anon` role.

In your Supabase project, open **Storage**, create a public bucket named `plant-images`, then open **SQL Editor**, create a new query, paste the SQL below, and run it:

```sql
insert into storage.buckets (id, name, public)
values ('plant-images', 'plant-images', true)
on conflict (id) do update set public = true;

create policy "Allow anonymous plant image reads"
on storage.objects for select
to anon
using (bucket_id = 'plant-images');

create policy "Allow anonymous plant image uploads"
on storage.objects for insert
to anon
with check (bucket_id = 'plant-images');
```

Because this phase intentionally has no login, anyone with your project URL and anon key can upload and read files in this bucket. Use this only as a personal, single-user setup and add authentication before sharing the deployed app broadly.

### 1. Create the backup table

In your Supabase project, open **SQL Editor**, create a new query, paste the SQL below, and run it:

```sql
create table if not exists public.app_backups (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_backups enable row level security;

create policy "Allow manual backup reads"
on public.app_backups for select
to anon
using (id = 'primary');

create policy "Allow manual backup inserts"
on public.app_backups for insert
to anon
with check (id = 'primary');

create policy "Allow manual backup updates"
on public.app_backups for update
to anon
using (id = 'primary')
with check (id = 'primary');
```

The app always uses the fixed record ID `primary`. Because this phase intentionally has no login, anyone with your project URL and anon key can access that record. Use this only as a personal, single-user setup and do not put sensitive information in the tracker. Authentication should be added before sharing the deployed app broadly.

If you already created `public.app_backups` for an earlier version, no migration is needed for v0.17.1. Saving to Cloud writes the full backup envelope into the existing `data` JSONB column.

### 2. Configure the app

1. Copy `.env.example` to a new file named `.env`.
2. Add your Supabase project URL to `VITE_SUPABASE_URL`.
3. Add your Supabase anon key to `VITE_SUPABASE_ANON_KEY`.
4. Restart the development app after changing environment variables.

Never commit `.env` or real credentials. Vite exposes variables prefixed with `VITE_` to the browser, so use only the Supabase anon key here—never a service-role key or another private secret. For a deployed app, add the same variables in your hosting provider and rebuild the site.

### 3. Use manual cloud sync

Open **Settings → Cloud Sync**. **Save cloud backup** writes the same complete data shape used by JSON backup. **Preview cloud backup** shows contents before restore. **Restore cloud backup** warns when the cloud backup appears older than local browser changes and creates a local safety snapshot first. **Check cloud status** checks the fixed `primary` backup record and displays its last-save time.

## Backup schema and data inventory

The shared backup logic lives in `src/backupUtils.js`. Backups use this envelope:

```json
{
  "app": "plant-inventory",
  "schemaVersion": 2,
  "appVersion": "v0.17.1",
  "exportedAt": "ISO timestamp",
  "deviceId": "browser client id",
  "data": {}
}
```

The `data` object includes these registered user-data collections:

- `plants`: active, archived, and graveyard plants, including plant detail fields, quarantine fields, rehab/progress notes, tissue culture tracker fields, LECA tracker fields, corm/propagation status, Activity Log entries, Plant Photo Log entries, manual Plant Health Timeline entries, and image URLs.
- `dropdownOptions`: custom dropdown values, including old/custom soil mix values.
- `wishlistItems`: wishlist, purchase, order, shipping, conversion, notes, and wishlist image URL data.
- `gardenBeds`: garden beds plus nested crops, activity, harvests, notes, and image URLs.
- `reminders`: active, dismissed, and completed reminders/check-ins with completion history and notes.
- `preferences`: intentionally persistent settings such as plant view mode and page sizes.
- `extraLocalStorage`: unknown future `plant-inventory-*` local storage keys, excluding backup metadata and safety snapshot keys.

Backups preserve image URLs only. They do not embed image file blobs.

Older v1 backups are normalized on import or cloud restore. Missing newer arrays and objects are restored to safe defaults, malformed backups are rejected before any local data is overwritten, and unknown fields inside collection records are preserved where practical. Before any successful restore, the app stores a local safety snapshot that can be used from Settings with **Undo last restore**.

Cloud sync remains manual backup/restore sync rather than live real-time synchronization. The app reads and writes only the `app_backups` row with ID `primary`, uses upsert for saves, prevents overlapping cloud requests, and does not report save success until Supabase confirms the write.

## Build and deploy

- Create a production build: `npm run build`
- Preview the production build: `npm run preview`
- Deploy the generated `dist` folder to a static host such as Vercel, Netlify, GitHub Pages, or Cloudflare Pages.

The app includes a web app manifest and a basic service worker. On iPhone or iPad, open the deployed HTTPS site in Safari and use **Share → Add to Home Screen**. Other mobile browsers may show an install option in their menu.

For GitHub Pages deployments under a repository subpath, set Vite's `base` option to that repository path before building. Hosts that publish at the domain root need no change.

## Adding resources

Resources are native app data, not linked documents. Add a new resource file in `src/resources/`, export a structured object with `id`, `title`, `version`, `category`, `description`, `lastUpdated`, `icon`, and `sections`, then add it to the `resources` array in `src/resources/index.js`. The Resources landing page will pick it up from that registry.

## Important data note

Data is stored in this browser's local storage and does not automatically sync. Use **Settings → Cloud Sync** for manual Supabase backup/restore, and keep using **Export Data** for downloadable JSON backups.

The service worker caches only the app shell for a basic offline launch. It does not sync or upload plant data.
