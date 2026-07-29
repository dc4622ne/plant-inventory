# Plant Tracker

## v0.25.0 — Collection Control & Insights

Release D adds correction controls for existing Corm phase dates and phases, safe Plant duplication into a reviewable unsaved draft, and lifetime recorded spending across active, archived, and graveyard plants. Spending includes valid non-negative purchase prices (including zero and legacy dollar-formatted values) and excludes missing or malformed prices.

Settings now distinguishes protected built-in dropdown choices from alphabetized user-created choices. Deleting a choice reports affected plants and requires a valid replacement or an explicit clear; matching Quick View criteria are migrated at the same time. Corm and Propagation parent selectors exclude Corm and Tissue Culture records and flag an existing invalid relationship until it is corrected.

Duplication copies reusable profile, acquisition, care, tracker setup, and custom-field selections, but never IDs, timestamps, journal/check-in/activity/photo/care/lifecycle histories, Corm phase history, or other event histories. The primary photo is intentionally left blank because copying an embedded image reference can duplicate a large local payload.

## v0.24.0 — Plant Detail UX Overhaul and Interface Consistency

Plant Detail now uses denser responsive field rows and clearer overview, identity/origin, environment, care, tracker, and history hierarchy while preserving populated-only rendering, sticky section navigation, direct tracker updates, quick actions, safe-area handling, return-to-top, and photo enlargement. A reusable compact floating navigator is mounted at the application shell and remains available across primary screens, with a contextual Edit This Plant action on Plant Detail.

Plant Journal entries can be edited in place without changing their ID, original creation time, plant relationship, filed state, or conversion metadata. Informational release content now lives in About, Dashboard customization is the final content area, the Dashboard opens directly on useful controls, and unordered categorical dropdowns are alphabetized without changing stored values or intentionally ordered workflows.

## v0.23.0 — Smart Home Dashboard

The Dashboard is now a calm, mobile-first daily home screen with concise cards for Needs Attention, Check-ins, Quarantine, Recently Added, Watch List, Tissue Culture, LECA conversions, Corm progress, recent activity, Plant Journal, restored Plant Insights charts, and collection statistics. Add New Plant and New Journal Entry remain permanently available above the customizable cards. Every card links into an existing Plant Tracker destination or filtered Plant List.

Choose **Customize Dashboard** to show or hide sections, move them with touch-friendly up/down controls, or restore the application default. Preferences are stored locally in a versioned format; newly introduced and restored cards are inserted without overwriting existing order or visibility choices, and invalid old card IDs are ignored safely. Plant List filters remain collapsed when opening any filtered Dashboard or Quick View destination; active criteria, results, and the compact Filter count remain intact.

Plant Insights contains six interactive charts: Plants by Type/Category, Plants by Growing Medium, Current Lifecycle Phase, LECA Status, Tissue Culture Stages, and Corm Progress. Tracker charts select the latest valid current history value, count each active plant once, and keep legacy or missing records visible as Other or Not specified.

## v0.22.0 — Mobile Polish and Corrections

- Added consistent iPhone safe-area handling, an accessible return-to-top control, and an enlarged Plant Details photo viewer.
- Save and Add now clears the form, returns to its top, and focuses the plant name after a successful save.
- Custom Soil Mix / Substrate values and backdated Corm phase dates now save and restore reliably.
- Blank optional Plant Details rows and empty sections are hidden without hiding meaningful zero or false values.

## v0.21.0 — Origins, Corms & Plant Journal

- Plant Journal entries can be captured from the Plant List or Plant Detail with automatic timestamps, an optional plant, and an optional stored photo. Unfiled entries remain intact until a destination save succeeds.
- Plant `origin` is permanent history and is independent from `lifecycleStage`. Older records are normalized conservatively from existing values without overwriting category, status, or tracker data.
- Lifecycle transitions retain the plant ID and append dated, reversible history entries. Tissue Culture, Corm, LECA, health, check-in, photo, and activity data stay on the same record.
- Corm-origin and Corm-stage plants receive a directly editable Corm Tracker with growth methods, milestone phases and dates, phase history, notes, photos, and outcome.
- Every categorical Plant List filter supports multiple values. Selections use OR logic within one group and AND logic across different groups, including predictable “Unknown or not recorded” matching.
- The Plant List uses a compact Quick View selector with Active/Modified status, Save as Quick View, and Restore Default. Editing, renaming, duplicating, and confirmed deletion live in the dedicated Settings → Quick Views section.
- Previously seeded or built-in views normalize into ordinary saved Quick Views with preserved IDs and criteria, so every view can be edited or deleted.
- Settings keeps Cloud Sync immediately available while other tool sections collapse independently. General application and storage information is available from About.
- Settings includes responsive section navigation for Quick Views, cloud sync, backup and restore, import/export, version information, and general app details.
- Backup schema v4 retains the existing internal journal collection and storage key for backward compatibility, and now registers the additive Quick Views collection without requiring a schema-version increase.

Migration is additive: missing arrays become empty arrays, old singular filter values normalize into one-item arrays, malformed saved views are ignored or repaired safely, and missing origin/stage values receive sensible inferred defaults.

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
  "schemaVersion": 3,
  "appVersion": "v0.18.0",
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
- `plantSpaces`: visual Plant Spaces, including Plant Wall background URLs, dimming settings, percentage-based placements, z-index, shelf/zone labels, and unknown future placement fields.
- `reminders`: active, dismissed, and completed reminders/check-ins with completion history and notes.
- `preferences`: intentionally persistent settings such as plant view mode and page sizes.
- `extraLocalStorage`: unknown future `plant-inventory-*` local storage keys, excluding backup metadata and safety snapshot keys.

Backups preserve image URLs only. They do not embed image file blobs.

Older v1 backups are normalized on import or cloud restore. Missing newer arrays and objects are restored to safe defaults, malformed backups are rejected before any local data is overwritten, and unknown fields inside collection records are preserved where practical. Before any successful restore, the app stores a local safety snapshot that can be used from Settings with **Undo last restore**.

Cloud sync remains manual backup/restore sync rather than live real-time synchronization. The app reads and writes only the `app_backups` row with ID `primary`, uses upsert for saves, prevents overlapping cloud requests, and does not report save success until Supabase confirms the write.

Restore is transactional in v0.21.1. The app downloads and normalizes the complete backup before changing live data, prepares every serialized value in memory, retains an exact rollback copy, writes a safety snapshot without first duplicating the live collections, verifies every write, and restores the exact original keys if any phase fails. Privacy-safe console diagnostics report phase names, error codes, collection/key counts, schema version, and approximate byte sizes without logging plant records or backup contents.

The v0.21.1 fix addresses installed iOS/iPadOS restore failures caused by the previous write order temporarily storing a full second copy of the current database before removing the live keys. Safari and an installed Home Screen app use separate website-data containers, so the standalone container could hit its `localStorage` quota even when the same cloud backup restored in Safari.

Starting with v0.21.2, legacy `data:image/...` photos are explicitly migrated into the browser's IndexedDB asset store before structured data is written. Plant records, photo logs, journal entries, and other collections retain only small `plant-asset://` references locally. JSON export and Save to Cloud materialize those references back into a compatible v4 backup, while new device photo uploads continue to use Supabase Storage URLs. The persistent undo snapshot contains references rather than a second copy of photo bytes.

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
