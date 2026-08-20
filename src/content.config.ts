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
      'care-sheet', // a published care sheet from a keeper or institution
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

const species = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/species' }),
  schema: z.object({
    commonName: z.string(),
    scientificName: z.string(),
    aliases: z.array(z.string()).default([]),
    family: z.string().default('Salticidae'),
    nativeRange: z.string(),
    adultSize: z.object({
      female: z.string(),
      male: z.string(),
    }),
    lifespan: z.object({
      female: z.string(),
      male: z.string(),
    }),
    temperament: z.enum(['bold', 'shy', 'skittish', 'variable']),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    temperatureC: z.object({
      min: z.number().int().min(0).max(45),
      max: z.number().int().min(0).max(45),
    }),
    humidityPct: z.object({
      min: z.number().int().min(0).max(100),
      max: z.number().int().min(0).max(100),
    }),
    /** Rough guide only — real intervals vary a lot by temperature and feeding. */
    typicalMoltIntervalDays: z.number().int().positive().optional(),
    heroImage: z.string().optional(),
    imageCredit: z.string().optional(),
    // Required: every species has at least a World Spider Catalog entry, so
    // there is never a good reason for a profile to cite nothing.
    sources: z.array(source).min(1, 'Add at least one source — see CONTRIBUTING.md'),
    tips: z.array(tip).default([]),
    contributors: z.array(z.string()).default([]),
    updated: z.coerce.date(),
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
