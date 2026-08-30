import { getCollection } from 'astro:content';

/**
 * Flattens every species photo into one shuffled list, shared by the landing
 * page treatments so they all draw from the same pool.
 *
 * Shuffled at build time rather than per visit: doing it in the browser would
 * mean shipping JavaScript to the one page that currently needs none.
 */
export async function speciesShots(count?: number) {
  const species = await getCollection('species');

  const shots = species.flatMap((entry) =>
    (['female', 'male'] as const).flatMap((sex) => {
      const photo = entry.data.images?.[sex];
      return photo
        ? [{ slug: entry.id, commonName: entry.data.commonName, sex, photo }]
        : [];
    }),
  );

  for (let i = shots.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shots[i], shots[j]] = [shots[j], shots[i]];
  }

  if (count === undefined || shots.length === 0) return shots;

  // Cycle the pool if there are fewer photos than asked for, so a treatment
  // that depends on a fixed count (the crossfade timing) still works early on.
  return Array.from({ length: count }, (_, i) => shots[i % shots.length]);
}

/** CC BY and CC BY-SA oblige credit wherever a photo appears, not just on its profile. */
export function creditLine(shots: { photo: { credit: string; license: string } }[]) {
  return [...new Set(shots.map((s) => `${s.photo.credit} (${s.photo.license})`))].join(' · ');
}
