# v0.27.0 HTTPS staging preview

Use a stable, non-production HTTPS hostname for iPhone and passkey validation. An ephemeral Vercel deployment URL is suitable for basic testing, but a stable staging alias is preferred because passkeys are bound to the configured relying-party domain.

## Preview environment

Set these variables for the Vercel **Preview** environment only:

```text
VITE_APP_ENV=staging
VITE_SUPABASE_URL=https://YOUR-STAGING-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_STAGING_PUBLISHABLE_KEY
VITE_DATABASE_ENABLED=true
VITE_AUTH_ENABLED=true
VITE_REALTIME_ENABLED=true
```

Never use a service-role key in a `VITE_` variable. Confirm the rendered app shows the **Staging** badge before entering test data.

In Supabase Authentication → URL Configuration, set the Site URL to the stable staging HTTPS origin and add that exact origin to Redirect URLs. In Authentication → Passkeys, set the relying-party ID to the staging hostname only (no scheme, port, or path) and the relying-party origin to the exact `https://` origin. Changing the relying-party ID invalidates existing staging passkeys.

## Reviewed branch preview

Run these commands yourself after reviewing the working tree. Replace the file list with the exact files you intend to publish; do not use `git add .` while unrelated local files are present.

```powershell
git switch -c codex/v0.27-staging-validation
git status --short
git add <reviewed-file-1> <reviewed-file-2>
git diff --cached
git commit -m "Fix v0.27 staging spaces and photos"
git push -u origin codex/v0.27-staging-validation
```

With the repository connected to Vercel, the non-production branch push creates a Preview deployment. Identify it in the Vercel dashboard under Deployments, filter by branch `codex/v0.27-staging-validation`, and open the HTTPS URL whose environment is **Preview**. Do not promote it and do not run a production deployment command.

For iPhone/passkey testing, assign the project’s stable staging alias to this preview in the Vercel dashboard, then verify that alias exactly matches the Supabase redirect and passkey origin settings.

## Validation and removal

On desktop and iPhone, verify sign-in, passkey recovery fallback, Plant Spaces loading/empty/malformed behavior, add/edit/delete, offline photo preview, reconnect upload, retry, signed-photo refresh, cross-account isolation, logout/login, and installed-PWA reopen. Record failures before changing staging data.

After validation, remove the preview branch only when its changes are preserved elsewhere or intentionally discarded:

```powershell
git switch main
git branch -d codex/v0.27-staging-validation
git push origin --delete codex/v0.27-staging-validation
```

Deleting the branch allows the Git-integrated preview to become inactive according to the project’s Vercel retention settings. Remove any temporary staging alias from that deployment in the dashboard before reassigning it. These commands do not deploy or modify production.
