/**
 * The shape the Astro page hands to the React island. The tracker never reads
 * the content collection directly — the species list is rendered at build time
 * and passed in as a prop, so the island stays a plain client component.
 */
export interface SpeciesOption {
  slug: string;
  commonName: string;
  scientificName: string;
  typicalMoltIntervalDays?: number;
}
