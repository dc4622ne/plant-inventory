# v0.27.0 staging and manual QA

No checklist item is considered passed until its result is recorded against a configured non-production project.

## Staging activation

1. Create a Supabase staging project. Do not reuse production data.
2. Run `supabase/migrations/20260804000000_database_foundation.sql`, then `20260804010000_live_sync.sql` in SQL Editor.
3. Confirm `sync_records` appears under Database → Replication/Realtime. In SQL Editor, run:

   ```sql
   select schemaname, tablename
   from pg_publication_tables
   where pubname = 'supabase_realtime'
     and schemaname = 'public'
     and tablename = 'sync_records';
   ```

   This must return one row. Only when it returns no rows, apply:

   ```sql
   alter publication supabase_realtime
   add table public.sync_records;
   ```
4. Confirm Storage contains the private `plant-photos` bucket. Verify it is not public and the four ownership policies exist on `storage.objects`.
5. In Authentication → URL Configuration, add the deployed staging URL and `http://localhost:5173` as redirect URLs.
6. Configure SMTP for reliable confirmation/reset mail. Create two confirmed test users, A and B.
7. Copy `.env.example` to `.env.local`, provide staging URL/publishable key, and leave every `SUPABASE_TEST_*` integration value outside source control.
8. Build/start staging. On an installed PWA, close all windows, reopen, use About → Check for updates, and confirm v0.27.0 before testing.

## Automated hosted policy verification

Supply `SUPABASE_TEST_URL`, `SUPABASE_TEST_PUBLISHABLE_KEY`, `SUPABASE_TEST_USER_A_JWT`, and `SUPABASE_TEST_USER_B_JWT` in the shell, then run `npm run test:integration`. The suite verifies cross-user SELECT/INSERT/UPDATE/DELETE denial, stale revision rejection, mutation idempotency, private-path denial, and owner-only Storage upsert. Tokens must never be placed in `.env.example` with values or committed.

## Two-device and offline flow

- Sign in as A on desktop and installed iPhone PWA. Add a plant on desktop; confirm it appears on iPhone. Edit it on iPhone; confirm desktop updates.
- Add separate journal/check-in/history records on different devices and verify stable IDs and both records survive.
- Disable iPhone networking. Edit a plant and add a note/photo. Close/reopen the PWA; confirm cached data, pending record/photo counts, and local image remain.
- Reconnect. Confirm automatic upload, one resulting record/photo, signed image rendering, and eventual Synced state.
- Background/foreground repeatedly and confirm one Realtime subscription and no duplicate mutations.

## Conflict simulation

1. Open the same plant on both devices at the same synced revision.
2. Disconnect iPhone; edit the same text field there. Edit it differently on desktop and wait for sync.
3. Reconnect iPhone. Open the global conflict warning and Settings status.
4. Verify label, field, local/remote values, devices and timestamps. Test Keep this device, Keep other device, manual combine, and Resolve later on separate conflicts.
5. Confirm resolved conflicts stay pending until upload acknowledgment and do not recur from Realtime echo.
6. Repeat with different fields and separate history entries; confirm automatic merge without a conflict.

## Migration, images, and isolation

- Start with populated v0.26 data containing every backup collection, nested histories, base64 photos, IndexedDB photos, and relationships. Sign into empty A; compare migration counts and safety snapshot.
- Interrupt during records and photos, restart, and verify no duplicate IDs/uploads or replacement snapshot.
- Verify failed photos remain locally viewable/retryable and structured records complete independently.
- Sign out with pending work and sign back into A; confirm resumption. Sign into B and confirm A’s records, mutations, conflicts and signed URLs never render or upload.
- Attempt to claim the same legacy dataset with B; confirm it is not automatically migrated. Exercise Remove offline data for B and confirm A’s namespace and hosted B data remain.

## Diagnostics and safe staging reset

- Settings → Account & Live Sync shows abbreviated user/device IDs, Realtime state, pending records/photos, conflicts, permanent failures, and last success.
- Browser DevTools → Application → IndexedDB → `plant-tracker-live-sync` shows queue state and error codes without tokens or full image payloads in logs.
- To reset one test account, first export a backup, sign into that account, remove its test records through the app, wait for sync, then use Remove offline data. Delete the test Auth user from the staging Dashboard only when a total hosted reset is intended.
- Never truncate shared staging tables while another tester is active. Integration-test records use an `integration-` prefix and clean themselves up.

## Layout review

- Review authentication, status, migration summaries and every conflict action at 390 × 844, landscape phone and desktop widths.
- Verify safe areas, keyboard visibility, sticky actions, long text wrapping, image placeholders, touch targets and screen-reader dialog labels.
