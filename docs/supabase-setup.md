# Supabase Setup

1. Create or select a Supabase project in the intended region. Keep production and development separate.
2. Install/check the current Supabase CLI and inspect commands with `supabase --help`. Link only a disposable development project for the first application.
3. Review the migration SQL, take a project backup, and run the migration against a local Supabase stack or isolated development branch first. The timestamped migration is a one-time history entry: do not manually rerun its statements, because tables and policy names intentionally fail on a second execution rather than silently replacing security rules.
4. Run migration-list checks, database/security advisors, the SQL verification examples, and cross-user RLS/Storage tests. Inspect every advisor result before promoting the same unchanged migration through the normal reviewed migration workflow.
5. Confirm `schema_metadata.application_schema_version = 1` only after the entire migration succeeds. Supabase migration tooling applies a migration transactionally; if a tool/environment reports partial execution, stop, preserve logs, restore the pre-migration project backup or recreate the isolated branch, and do not mark the migration applied manually.
6. The initial migration creates the private `plant-photos` bucket idempotently and creates its policies once. Confirm the bucket is private and that authenticated user A cannot list, read, insert, rename, update, or delete user B paths or change an object's owner metadata.
7. Copy `.env.example` to a local ignored `.env`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the public project values. Never place a service-role/secret key in Vite variables, source, CI logs, or browser code.
8. Leave `VITE_DATABASE_ENABLED`, `VITE_AUTH_ENABLED`, and `VITE_REALTIME_ENABLED` as `false` for Release E. The current app runs without any Supabase values.
9. Add the same public URL/key and disabled flags in Vercel project environment settings for each desired environment. Rebuild only through the normal approved deployment process; Release E itself is not deployed by this work.
10. Verify RLS is enabled on every exposed user-owned table. Test authenticated CRUD for an owner, cross-user denial, profile ID enforcement, `user_id` reassignment denial, cross-owner foreign-key denial, and anonymous denial. Check explicit Data API grants separately from RLS.
11. With a test project and authenticated user, enable only the required flag in a non-production environment and run the diagnostics connection check. Expected application schema version is 1 and backup schema version is 4.

## Hosted verification procedure

Release E was verified against a fresh, isolated Supabase project rather than a linked production project. The verification project started with zero public tables and zero migration-history entries. Only `supabase/migrations/20260804000000_database_foundation.sql` was applied through the Supabase migration API; no browser data, production data, environment variables, or deployment settings were copied.

After applying the migration, verify PostgreSQL 17.6 or the currently supported project version, one migration-history entry, 20 user-owned tables plus `schema_metadata`, RLS on all 21 public tables, 20 UUID primary keys on the user-owned tables, 20 composite owner foreign keys, all expected common columns, both public helper functions, schema versions 1 and 4, and a private `plant-photos` bucket. Run two authenticated temporary-user tests for owner CRUD, cross-user denials, cross-owner foreign keys, Storage paths and moves, optimistic concurrency, soft deletion, restoration, and retained child history.

Run both Supabase security and performance advisors after the data tests. On a newly created empty database, `unused_index` informational notices are expected because no representative workload has accumulated; `unindexed_foreign_keys`, RLS, or security findings are not expected. Capture the results, delete temporary users and objects, and then delete the entire verification project. Confirm through the organization project list that only the intended long-lived projects remain.

The local Supabase CLI and Docker were unavailable during the hosted verification, so no project was linked locally and no CLI command was used against production. The authenticated Supabase migration/query interfaces supplied the equivalent isolated apply and inspection operations. On Windows systems where Node's TLS store does not recognize the local trust chain, temporary API verification scripts may require `NODE_OPTIONS=--use-system-ca`; do not persist that setting in application or production configuration.

## Rollback and recovery

Before production use, rollback is primarily operational: disable all three flags and verify the browser-local application. Release E never redirects or migrates local data, so local records remain intact.

For an isolated development project, restore the pre-migration project backup or recreate the development branch. For a shared environment, never improvise destructive `drop` statements. Prepare a separately reviewed down migration in dependency order: revoke function execution, remove Storage policies, remove the bucket only after confirming it has no objects, remove table policies, then drop dependent tables before parent tables and finally schema metadata. Preserve `migration_runs` and `migration_conflicts` exports for audit. Auth users and existing legacy `app_backups` are outside this migration and must not be deleted.

If migration application fails, retain the exact SQL error and migration-history state. Do not edit an already-applied timestamped migration; correct it with a new forward migration. Because this file has not yet been applied anywhere, review corrections may still be made directly before approval.
# v0.27.0 Live Sync activation

Apply both migration files in lexical order. The second migration adds the user-owned `sync_records` envelope, revision/idempotency RPC, Realtime publication, photo metadata additions, and private Storage integration used by the local-first coordinator. The browser must receive only a publishable or legacy anon key; never expose a secret/service-role key.

For hosted policy verification, export these temporary shell variables without committing their values:

```text
SUPABASE_TEST_URL="https://YOUR-STAGING-PROJECT.supabase.co"
SUPABASE_TEST_PUBLISHABLE_KEY="YOUR_STAGING_PUBLISHABLE_KEY"
SUPABASE_TEST_USER_A_JWT="A_FRESH_TEMPORARY_USER_A_ACCESS_TOKEN"
SUPABASE_TEST_USER_B_JWT="A_FRESH_TEMPORARY_USER_B_ACCESS_TOKEN"

```

Run `npm run test:integration`. The test is skipped with an explicit reason when credentials are absent. See `docs/live-sync-manual-qa.md` for project, Auth, Realtime, Storage, PWA, and safe-reset steps.

## Experimental passkey setup

Supabase passkeys are currently experimental. Plant Tracker keeps every passkey call inside `src/services/authService.js` so API changes cannot affect collection storage or synchronization, and email/password remains the recovery path.

In the staging project, open **Authentication → Passkeys**, enable passkey authentication, and configure:

- Relying Party Display Name: `Plant Tracker`
- Relying Party ID: the bare staging application domain, without a scheme, port, or path
- Relying Party Origins: the exact staging HTTPS origin; add a loopback development origin only when local passkey testing is required

Choose the relying-party ID carefully because changing it invalidates previously registered passkeys. The installed PWA and Safari must use an origin permitted by the same relying-party configuration. Registration requires a signed-in, confirmed, non-anonymous account. Face ID, Touch ID, a device passcode, or another platform authenticator is handled entirely by the operating system; Plant Tracker never receives biometric data or private key material.
