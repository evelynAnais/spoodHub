import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'zod';

/**
 * These schemas are the contract for community contributions.
 *
 * If someone opens a pull request with a missing field, a bad enum value or a
 * malformed URL, `astro build` fails and GitHub shows a red X on the PR before
 * a human ever has to review it. Adding a field here means every existing
 * entry must supply it (or you give it a `.default(...)`).
 */

/**
 * `kind` is what stops a required citation from becoming a box-ticking
 * exercise. Husbandry practice genuinely does not all have peer-reviewed
 * backing, and pretending otherwise is worse than saying so — this way a
 * reader can see at a glance whether a claim rests on a paper or on the
 * accumulated habit of the hobby, and both can be cited honestly.
 */
const source = z.object({
  label: z.string(),
  url: z.url(),
  kind: z
    .enum([
      'paper', // peer-reviewed research
      'book', // published reference text
      'database', // taxonomic or distribution database
      'institution', // museum, university or scientific body's own material
      'care-sheet', // a published care sheet from a keeper or shop
      'community', // forum consensus, keeper groups — weakest, but honest
    ])
    .default('care-sheet'),
});

/**
 * Keeper experience, kept deliberately separate from the body of a page.
 *
 * Body prose is held to a citation — `sources` is required below. Firsthand
 * experience is genuinely valuable but is not the same kind of claim, so it
 * lives here instead, always attributed, and renders in its own block labelled
 * as individual observation. The point is that a reader never has to infer
 * which of the two they are looking at.
 */
const tip = z.object({
  text: z.string().min(1),
  /** Who observed it. A name or GitHub handle — anonymous tips are not useful. */
  by: z.string().min(1),
  /**
   * What makes the observation interpretable: species, instar, setup, how long
   * it was seen over. An anecdote without context cannot be weighed.
   */
  context: z.string().optional(),
});

/**
 * A photo plus everything needed to use it lawfully.
 *
 * Credit, licence and the page it came from are all required rather than
 * optional. Most usable spider photography is Creative Commons, which obliges
 * attribution — so an image without those details is not publishable, and the
 * schema should refuse it rather than leave it to a reviewer to notice.
 */
const photo = (image: ImageFn) =>
  z.object({
    src: image(),
    /** Described for a reader who cannot see it — not just "a spider". */
    alt: z.string().min(10),
    credit: z.string().min(1),
    /** e.g. "CC BY-SA 4.0", "CC0", "Public domain" */
    license: z.string().min(1),
    /** The page the photo came from, so the licence can be checked. */
    sourceUrl: z.url(),
  });

type ImageFn = () => z.ZodType;

const species = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/species' }),
  schema: ({ image }) => z.object({
    commonName: z.string(),
    scientificName: z.string(),
    aliases: z.array(z.string()).default([]),
    family: z.string().default('Salticidae'),
    nativeRange: z.string(),

    /**
     * Set to 'undocumented' only when no published husbandry data exists for
     * this species — which is true of most of the ~7,000 salticids.
     *
     * This is deliberately an explicit declaration rather than simply leaving
     * the fields blank. Optional fields would let a contributor omit them by
     * accident, and a reader could not tell "unknown" from "nobody bothered".
     * Saying it out loud makes the absence a stated fact, and the page renders
     * it as one.
     *
     * The refinement below then requires the profile to earn its place — see
     * the comment there.
     */
    careData: z.enum(['undocumented']).optional(),

    adultSize: z
      .object({
        female: z.string(),
        male: z.string(),
      })
      .optional(),
    lifespan: z
      .object({
        female: z.string(),
        male: z.string(),
      })
      .optional(),
    temperament: z.enum(['bold', 'shy', 'skittish', 'variable']).optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    temperatureC: z
      .object({
        min: z.number().int().min(0).max(45),
        max: z.number().int().min(0).max(45),
      })
      .optional(),
    humidityPct: z
      .object({
        min: z.number().int().min(0).max(100),
        max: z.number().int().min(0).max(100),
      })
      .optional(),
    /** Rough guide only — real intervals vary a lot by temperature and feeding. */
    typicalMoltIntervalDays: z.number().int().positive().optional(),
    /**
     * Photos of each sex. Optional because a profile is still useful without
     * them, but jumping spiders are often dramatically dimorphic — a keeper
     * trying to sex a spider benefits more from seeing both than from any
     * amount of prose.
     */
    images: z
      .object({
        female: photo(image).optional(),
        male: photo(image).optional(),
      })
      .optional(),
    // Required: every species has at least a World Spider Catalog entry, so
    // there is never a good reason for a profile to cite nothing.
    sources: z.array(source).min(1, 'Add at least one source — see CONTRIBUTING.md'),
    tips: z.array(tip).default([]),
    contributors: z.array(z.string()).default([]),
    updated: z.coerce.date(),
  })
  .superRefine((data, ctx) => {
    const HUSBANDRY = [
      'adultSize',
      'lifespan',
      'temperament',
      'difficulty',
      'temperatureC',
      'humidityPct',
    ] as const;

    // Normal profiles: husbandry data is required, exactly as before.
    if (data.careData !== 'undocumented') {
      for (const field of HUSBANDRY) {
        if (data[field] === undefined) {
          ctx.addIssue({
            code: 'custom',
            path: [field],
            message:
              'Required. If no published care data exists for this species, set ' +
              'careData: undocumented instead — see CONTRIBUTING.md.',
          });
        }
      }
      return;
    }

    /**
     * Undocumented profiles have to earn their place, or this section drifts
     * from a keeper's care reference into a list of every salticid on Earth.
     *
     * There are exactly two ways a species with no published husbandry data is
     * still worth a page:
     *
     *   1. Someone keeps it — proven by a firsthand tip plus a photo. You
     *      cannot photograph a spider you do not have.
     *   2. It has been studied — proven by a peer-reviewed source, which is why
     *      Evarcha arcuata and Saitis barbipes belong here.
     *
     * A World Spider Catalog entry alone satisfies neither, which is precisely
     * what stops anyone generating stub profiles straight from a database.
     */
    const hasFirsthand =
      data.tips.length > 0 &&
      (data.images?.female !== undefined || data.images?.male !== undefined);
    const hasResearch = data.sources.some((s) => s.kind === 'paper');

    if (!hasFirsthand && !hasResearch) {
      ctx.addIssue({
        code: 'custom',
        path: ['careData'],
        message:
          'A profile without published care data needs either (a) firsthand experience — at ' +
          'least one entry in `tips` AND at least one photo, proving you keep this spider — or ' +
          '(b) a peer-reviewed source (kind: paper) showing it has been studied. ' +
          'A taxonomic database entry alone is not enough. See CONTRIBUTING.md.',
      });
    }
  }),
});

const care = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/care' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    /** Lower numbers sort first in the care index. */
    order: z.number().default(99),
    tags: z.array(z.string()).default([]),
    // Required: a care guide makes husbandry claims, and unsourced husbandry
    // advice is how bad practice spreads. Experience goes in `tips` instead.
    sources: z.array(source).min(1, 'Add at least one source — see CONTRIBUTING.md'),
    tips: z.array(tip).default([]),
    contributors: z.array(z.string()).default([]),
    updated: z.coerce.date(),
  }),
});

export const collections = { species, care };
