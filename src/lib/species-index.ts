import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

import type { SpeciesLinkTarget } from './rehype-species.ts';

/**
 * Reads the species profiles straight off disk.
 *
 * The auto-linker runs as a rehype plugin configured in astro.config.mjs, which
 * is evaluated before content collections exist — so `getCollection('species')`
 * is not available there. Parsing the frontmatter ourselves is the way to give
 * the plugin its list of link targets.
 *
 * Only the few fields the linker needs are read; the schema in
 * content.config.ts remains the authority on everything else, and a malformed
 * profile still fails the build there.
 */
export function loadSpeciesIndex(dir = 'src/content/species'): SpeciesLinkTarget[] {
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => /\.mdx?$/.test(f) && !f.startsWith('_'));
  } catch {
    return [];
  }

  const targets: SpeciesLinkTarget[] = [];

  for (const file of files) {
    const raw = readFileSync(join(dir, file), 'utf8');
    const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
    if (!match) continue;

    let data: Record<string, unknown>;
    try {
      data = parse(match[1]) ?? {};
    } catch {
      // A broken profile is reported properly by the content schema at build
      // time; skipping it here just means it does not get auto-linked.
      continue;
    }

    const scientificName = typeof data.scientificName === 'string' ? data.scientificName : '';
    const commonName = typeof data.commonName === 'string' ? data.commonName : '';
    if (!scientificName) continue;

    targets.push({
      slug: file.replace(/\.mdx?$/, ''),
      scientificName,
      commonName,
      aliases: Array.isArray(data.aliases)
        ? data.aliases.filter((a): a is string => typeof a === 'string')
        : [],
    });
  }

  return targets;
}
