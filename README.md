# Made For Anita

A birthday surprise you build and send as a link or QR code. The recipient sees a countdown, a raining-letters greeting, an animated gift, a photo book of 5 photos you can swipe through, and a heart-shaped photo collage of up to 15 photos (tap one to enlarge it).

An admin area at `/admin` lets you sign in with your own password, add photos, edit the greeting and captions, pick or upload music, preview, and then share the link or QR code. Older USDC gift links (`?to=0x...`) still open the USDC gift page.

Built with [Arc Studio](https://studio.arc.io)

## Tech stack

React, Vite, TypeScript, Tailwind CSS, framer-motion, a small Node/Bun file-backed API, wagmi and viem (USDC gift page).

## Development

Prerequisites: [Bun](https://bun.sh).

```bash
bun install
bun run dev
```

Open `/admin` and create your admin password the first time, before sharing the site with anyone.

Other commands: `bun run check` (lint and typecheck), `bun run build` then `bun run start` (production server for the app and API).

Surprises, uploaded photos and songs are stored as files in the `data/` folder when you run the app yourself (`bun run dev` or `bun run start`). Keep that folder on persistent storage and back it up.

## Deploying to Netlify

The repository includes `netlify.toml` and a Netlify Function in `netlify/functions/`. On Netlify the admin area, uploads and saved surprises work without any extra setup: data is kept in Netlify Blobs, so it survives new deploys. Create your admin password the first time you open `/admin` on the live site. Songs are limited to 5 MB because of Netlify's request size limit.

## Environment variables

- `PORT`: port for `bun run start` (optional, defaults to 3000).
- `DATA_DIR`: where surprises and uploads are stored when self-hosting (optional, defaults to `data`). Not used on Netlify.
