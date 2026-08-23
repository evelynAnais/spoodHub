# Contributing

Care information on this site comes from keepers. If something here is wrong, incomplete, or
missing a species, the fix is a pull request — and adding a species needs no knowledge of how
the app works.

## The short version

1. Add or edit a Markdown file in `src/content/species/` or `src/content/care/`.
2. Open a pull request.
3. Automated checks validate your frontmatter. A missing or malformed field fails the build and
   shows on the PR before a human looks at it.

GitHub's pencil button is a perfectly good way to do this. You do not need to clone anything.

## Adding a species

Create `src/content/species/<genus-species>.md`, lowercase and hyphenated — for example
`phidippus-regius.md`. The filename becomes the URL.

```markdown
---
commonName: Regal Jumping Spider
scientificName: Phidippus regius
aliases:
  - Regal jumper
nativeRange: Southeastern United States, the Bahamas and the Greater Antilles
adultSize:
  female: 15–22 mm
  male: 12–18 mm
lifespan:
  female: 18–24 months
  male: 12–18 months
temperament: bold          # bold | shy | skittish | variable
difficulty: beginner       # beginner | intermediate | advanced
temperatureC:
  min: 21
  max: 27
humidityPct:
  min: 50
  max: 70
typicalMoltIntervalDays: 35

# At least one source is required. `kind` decides the badge readers see.
sources:
  - label: World Spider Catalog — Phidippus regius (C. L. Koch, 1846)
    url: https://wsc.nmbe.ch/species/31858/Phidippus_regius
    kind: database         # paper | book | database | institution | care-sheet | community

# Optional. Your own observations go here rather than in the body text.
tips:
  - text: Mine refuses blue bottles below about 21 °C but takes them at 24 °C.
    by: your-name
    context: Two females, over about a year

updated: 2026-08-23
---

Everything below the dashes is ordinary Markdown, and becomes the body of the page.
```

### Species fields

| Field | Required | Notes |
| --- | --- | --- |
| `commonName` | yes | |
| `scientificName` | yes | |
| `aliases` | no | List of other names in use |
| `family` | no | Defaults to `Salticidae` |
| `nativeRange` | yes | |
| `adultSize` | yes | Object with `female` and `male` |
| `lifespan` | yes | Object with `female` and `male` |
| `temperament` | yes | One of `bold`, `shy`, `skittish`, `variable` |
| `difficulty` | yes | One of `beginner`, `intermediate`, `advanced` |
| `temperatureC` | yes | Object with `min` and `max`, whole numbers |
| `humidityPct` | yes | Object with `min` and `max`, 0–100 |
| `typicalMoltIntervalDays` | no | Rough guide; the tracker prefers a spider's own history |
| `heroImage` | no | |
| `imageCredit` | no | Required if you add an image |
| `sources` | **yes** | At least one `{ label, url, kind }` — see below |
| `tips` | no | Firsthand observations, `{ text, by, context }` — see below |
| `contributors` | no | Add yourself |
| `updated` | yes | `YYYY-MM-DD` |

### Species with no published care data

Most of the roughly 7,000 jumping spider species have never been kept or written up. For those,
declare it explicitly:

```yaml
careData: undocumented
```

That makes `adultSize`, `lifespan`, `temperament`, `difficulty`, `temperatureC` and `humidityPct`
optional, and the page renders a visible **"Husbandry not documented"** notice instead of a grid of
figures. Omit whichever you cannot source; keep the ones you can — size is often measured even when
nothing else is.

**This is a declaration, not a shortcut.** Without that line the six fields stay required and the
build fails. Saying it out loud means a reader can tell "nobody knows" from "nobody bothered".

**An undocumented profile must earn its place.** The build requires one of:

| Route | What proves it | Example |
| --- | --- | --- |
| **You keep it** | At least one `tips` entry **and** at least one photo | a wild-caught spider you are raising |
| **It has been studied** | At least one source with `kind: paper` | *Evarcha arcuata*, *Saitis barbipes* |

A World Spider Catalog entry alone is **not** enough. This is deliberate: without it, anyone could
generate hundreds of stub profiles from a taxonomic database and this would stop being a keeper's
care reference and become a species list. If you cannot offer either firsthand experience or
research, the species does not get a page yet.

### Photos

A profile can carry one photo of each sex. Put the files in `src/assets/species/` and reference
them relative to the profile:

```yaml
images:
  female:
    src: ../../assets/species/phidippus-regius-female.jpg
    alt: A female regal jumping spider on a leaf, facing the camera, grey and orange markings
    credit: Photographer Name
    license: CC BY-SA 4.0
    sourceUrl: https://commons.wikimedia.org/wiki/File:Example.jpg
  male:
    src: ../../assets/species/phidippus-regius-male.jpg
    alt: A male regal jumping spider, black with white abdominal bands and green chelicerae
    credit: Photographer Name
    license: CC BY-SA 4.0
    sourceUrl: https://commons.wikimedia.org/wiki/File:Example2.jpg
```

**Every field is required if you add a photo at all.** Most usable spider photography is Creative
Commons and obliges attribution, so an image without a credit, a licence and the page it came from
is not publishable — and the build rejects it rather than leaving a reviewer to catch it.

Only add photos you have the right to use: your own, or something under a licence that permits it.
`alt` should describe the spider for someone who cannot see the image, not just say "a spider".
Photos of both sexes are especially valuable, because jumping spiders are often dramatically
dimorphic and a keeper trying to sex a spider learns more from two pictures than from any
description.

### Species get linked automatically

When a care guide mentions a jumping spider that has a profile, the first mention is turned into a
link to that profile automatically. You do not need to write the link yourself — `Phidippus
regius`, `P. regius`, and `Regal Jumping Spider` all work.

Two consequences worth knowing:

- **Only species with a profile are linked**, so a mention of something not yet written up stays
  as plain text rather than becoming a broken link.
- **If your guide references a jumping spider we do not have a profile for, please add one**, even
  a short one. That is what keeps the guides connected to each other.

Non-salticids are never linked. The guides also mention *Parasteatoda tepidariorum* (a cobweb
spider, cited for pedipalp development) and *Drosophila* (prey); neither should point at a species
profile.

## Adding a care guide

Create `src/content/care/<topic>.md`:

```markdown
---
title: Enclosure setup
summary: One sentence describing what this covers.
order: 1
tags:
  - housing
sources:
  - label: Some published source
    url: https://example.org/
    kind: paper
tips: []
updated: 2026-08-23
---
```

`order` controls the position in the care index — lower comes first.

## Sources are required

Every species profile and care guide must cite **at least one source**. A page with none fails
the build. Each source is tagged with what kind of evidence it is, and that tag is shown to
readers next to the link:

```yaml
sources:
  - label: Rößler, D. et al. (2022) REM sleep-like state in jumping spiders
    url: https://www.pnas.org/doi/10.1073/pnas.2204754119
    kind: paper
```

| `kind` | Use for | Shown as |
| --- | --- | --- |
| `paper` | Peer-reviewed research | Peer-reviewed (green) |
| `book` | Published reference texts | Book (green) |
| `database` | World Spider Catalog, araneae, GBIF | Database (blue) |
| `institution` | Museum, university or scientific body material | Museum / university (blue) |
| `care-sheet` | Published care sheets from a keeper or shop — the default | Care sheet (gray) |
| `community` | Forum threads, keeper groups, wikis | Keeper community (amber) |

`community` is a legitimate thing to cite. Much of practical husbandry has never been formally
studied, and marking that honestly is better than dressing a forum consensus up as a finding.
What is not acceptable is citing a forum post as `paper`.

**Check that your URL resolves and points at what you think it does.** Guessed database IDs are
a real hazard — World Spider Catalog species numbers in particular are not predictable, so look
the page up rather than constructing the URL.

## Contributing from experience

If your contribution is your own observation rather than something you can cite, it belongs in
`tips`, not in the body of the page:

```yaml
tips:
  - text: >-
      Mine consistently refuses blue bottles below about 21 °C but takes them readily at 24 °C.
    by: your-name
    context: Two P. regius females, over about a year
```

Tips render in a separate "From keepers" block, attributed to you and explicitly labeled as
individual experience rather than established fact. This is not a lesser category — firsthand
observation is often the only information that exists on a topic. It is just a *different* kind
of claim than the body of a guide makes, and readers deserve to see which is which.

Include `context`: species, how many spiders, over what period. An anecdote without it cannot be
weighed against anything.

**Say when something is contested.** If keepers disagree about a practice, describe the
disagreement on the page rather than quietly picking a side.

## What good contributions look like

**Prefer ranges to single numbers.** "21–27 °C" is honest in a way that "24 °C" is not.

**Use metric,** with imperial in parentheses if you like.

**Do not add photos you do not have the rights to.** If you add an image, fill in
`imageCredit`.

## Changing the app itself

Contributions to the tracker are welcome too, with a few things worth knowing:

- **All database access goes through `src/lib/db.ts`.** Please do not reach into Dexie from
  components — keeping one boundary is what makes a future sync backend a single-file change.
- **`src/lib/types.ts` must not import Dexie.** It is deliberately free of it so the pre-molt
  rules can be unit-tested in plain Node.
- **The pre-molt rules have tests.** If you change `src/lib/premolt.ts`, run `npm test` and add
  a case for the behavior you changed.
- **Every record needs a UUID and `createdAt` / `updatedAt`.** Sync later depends on it.
- **Tailwind class names must be written out in full.** Anything built by string concatenation
  at runtime will not be generated.
- **Mind inline whitespace in `.astro` templates.** Astro collapses the newline between inline
  text and an element, so wrapping a line before `<a>`, `<em>`, `<strong>` or `<code>` silently
  eats the space:

  ```astro
  <!-- renders as "spiders are<em>as distant from insects" -->
  The Burke Museum puts it well: spiders are
  <em>"as distant from insects as birds are from fish."</em>

  <!-- correct -->
  The Burke Museum puts it well: spiders are{' '}
  <em>"as distant from insects as birds are from fish."</em>
  ```

  The same applies to a tag immediately followed by an expression:
  `<strong>Native range:</strong>{' '}` then `{d.nativeRange}`.

  After editing any template, this should return nothing:

  ```sh
  npm run build
  grep -rohE '[a-zA-Z0-9,.?;:—)]<(strong|em|code|a)[ >]|</(strong|em|code|a)>[a-zA-Z0-9]' \
    dist --include=index.html
  ```

  Ignore hits involving `<span>` — the `↗` external-link markers deliberately carry their own
  leading space. This does not affect the Markdown care guides, only `.astro` pages.

Before opening a PR:

```sh
npm run check    # types
npm test         # pre-molt rules
npm run build    # content schemas
```

## A note on scope

The tracker is deliberately local-only. Pull requests that add accounts, a server database, or
analytics are a significant change in what this project is and should start as an issue rather
than a PR.
