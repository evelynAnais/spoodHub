# spoodHub

An open jumping spider care reference, plus a feeding and molt tracker that runs entirely on
the keeper's own device.

Two things share one site because they are used together: you look up how long a *Phidippus
regius* usually goes between molts, and then you log that your own spider just refused its
third fly.

## What it is

**The care reference** is a static site built from Markdown files. Every species profile and
care guide is a file in `src/content/`, validated against a schema, so contributions arrive as
ordinary pull requests and malformed ones fail CI before a human reads them.

**The tracker** is a local-first web app. It stores everything in IndexedDB on the device it
runs on. There is no account, no server, and no database to pay for — which is also why it
works offline and why a backup file is the only thing standing between a keeper and data loss.

## Stack

| | |
| --- | --- |
| Framework | [Astro 7](https://astro.build) — static output, React islands |
| Interactive UI | React 19, mounted only on `/track` and `/log` |
| Styling | Tailwind CSS 4 |
| Content | Astro content collections, Zod-validated frontmatter |
| Tracker storage | [Dexie](https://dexie.org) over IndexedDB |
| Offline | Hand-written service worker (`public/sw.js`) |
| Hosting | Cloudflare Pages (static) |

Content pages ship zero JavaScript. The tracker is a `client:only` island, so all of its code
loads only on the pages that need it.

## Getting started

Requires **Node 22.12+** (Astro 7's minimum). An `.nvmrc` pins Node 24:

```sh
nvm use          # reads .nvmrc
npm install
npm run dev      # http://localhost:4321
```

| Script | Does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Static build into `dist/` |
| `npm run preview` | Serve the built output |
| `npm run check` | `astro check` — types across `.astro`, `.ts` and `.tsx` |
| `npm test` | Node's test runner over the pre-molt rules |

## Layout

```
src/
├── content/
│   ├── species/          Species profiles — contributions land here
│   └── care/             Husbandry guides — contributions land here
├── content.config.ts     Schemas that gate contributions
├── pages/
│   ├── species/          Generated from the species collection
│   ├── care/             Generated from the care collection
│   ├── track/            The tracker (React island)
│   ├── log/              Quick-log screen an enclosure tag opens
│   └── about.astro       How the tracker works + how to contribute
├── components/tracker/   React app — the only interactive code
└── lib/
    ├── types.ts          Record shapes, free of any Dexie import
    ├── db.ts             Dexie schema + every read and write
    ├── premolt.ts        The pre-molt heuristic
    ├── premolt.test.ts   …and its tests
    └── backup.ts         Export / import
```

## How the tracker stores data

Everything the keeper logs goes to IndexedDB via Dexie. Nothing is uploaded and no server sees
it. Two conventions exist so that adding sync later is not a migration nightmare:

- **every record carries a random UUID**, so two databases can merge without id collisions
- **every record carries `createdAt` / `updatedAt`**, so a merge can decide which copy wins

All database access goes through `src/lib/db.ts`. Nothing in the UI knows where data lives, so
a future server backend would mean rewriting one file rather than hunting through components.

### If sync is ever added

The current design is single-device on purpose. If cross-device sync becomes worth building:

- **Personal sync only** — Cloudflare Workers + D1, same platform as the hosting, no new vendor.
- **Multiple people with accounts** — Supabase, whose row-level security enforces "you can only
  read your own rows" in the database itself, rather than relying on every query remembering a
  `WHERE user_id = ?`.

Either way, Dexie stays as the local cache and the site keeps working offline.

## Enclosure tags

Each spider gets a quick-log link, `\/log?s=<uuid>`, shown on its page in the tracker.

Written to an NFC sticker the link opens the one-tap logging screen for that spider on any
modern phone, because the tag stores a plain URL that the operating system's own NFC reader
handles — no app, no Web NFC API, and it works on iOS as well as Android. Writing tags from the
browser needs Chrome on Android; a tag written once is readable everywhere.

The same URL works as a QR code if you would rather not buy tags.

A query parameter rather than a path because spider ids are generated on the keeper's device
and cannot be known at build time — a static site has no route to pre-render for them.

## Deploying

Cloudflare Pages, connected to the GitHub repo:

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | read from `.nvmrc` |

Cloudflare Pages is the choice over GitHub Pages because it is equally free and equally static
today, but Workers and D1 live on the same platform — so adding a backend later is an addition
rather than a migration.

## Contributing

Care information here comes from keepers. See [CONTRIBUTING.md](CONTRIBUTING.md) — adding a
species is one Markdown file and needs no knowledge of the app.

## Licence

Care content is contributed by keepers and is not veterinary advice.
