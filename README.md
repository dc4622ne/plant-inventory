# Plant Tracker

A mobile-friendly React app for tracking plants, care activity, wishlists, purchases, and garden beds. Data stays in the current browser using local storage.

## Run locally

Install dependencies with `npm install`, then start the development app with `npm run dev`.

## Supabase setup (foundation only)

Cloud sync is not active yet, and local browser storage remains the source of truth. To prepare a local Supabase configuration:

1. Copy `.env.example` to a new file named `.env`.
2. Add your Supabase project URL to `VITE_SUPABASE_URL`.
3. Add your Supabase anon key to `VITE_SUPABASE_ANON_KEY`.
4. Restart the development app after changing environment variables.

Never commit `.env` or real credentials. Vite exposes variables prefixed with `VITE_` to the browser, so use only the Supabase anon key here—never a service-role key or another private secret.

## Build and deploy

- Create a production build: `npm run build`
- Preview the production build: `npm run preview`
- Deploy the generated `dist` folder to a static host such as Vercel, Netlify, GitHub Pages, or Cloudflare Pages.

The app includes a web app manifest and a basic service worker. On iPhone or iPad, open the deployed HTTPS site in Safari and use **Share → Add to Home Screen**. Other mobile browsers may show an install option in their menu.

For GitHub Pages deployments under a repository subpath, set Vite's `base` option to that repository path before building. Hosts that publish at the domain root need no change.

## Important data note

Data is stored in this browser's local storage. It does not automatically sync between devices or browsers. Use **Settings → Export Data** and **Import Data** to move a JSON backup between devices until cloud sync is implemented.

The service worker caches only the app shell for a basic offline launch. It does not sync or upload plant data.
