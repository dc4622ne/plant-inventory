# Plant Tracker

A mobile-friendly React app for tracking plants, care activity, wishlists, purchases, and garden beds. Data stays in the current browser using local storage.

## Run locally

Install dependencies with `npm install`, then start the development app with `npm run dev`.

## Build and deploy

- Create a production build: `npm run build`
- Preview the production build: `npm run preview`
- Deploy the generated `dist` folder to a static host such as Vercel, Netlify, GitHub Pages, or Cloudflare Pages.

The app includes a web app manifest and a basic service worker. On iPhone or iPad, open the deployed HTTPS site in Safari and use **Share → Add to Home Screen**. Other mobile browsers may show an install option in their menu.

For GitHub Pages deployments under a repository subpath, set Vite's `base` option to that repository path before building. Hosts that publish at the domain root need no change.

## Important data note

Data is stored in this browser's local storage. It does not automatically sync between devices or browsers. Use **Settings → Export Data** and **Import Data** to move a JSON backup between devices until a database or cloud sync is added.

The service worker caches only the app shell for a basic offline launch. It does not sync or upload plant data.
