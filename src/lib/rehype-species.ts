/**
 * Auto-links the first mention of each jumping spider species to its profile.
 *
 * Two rules do most of the work here, and both matter:
 *
 *   1. Only species that HAVE a profile are linked. The species list is read
 *      from the content collection at build time and passed in, so a mention of
 *      something we have not written up stays plain text rather than becoming a
 *      404.
 *
 *   2. Only jumping spiders. The guides also name Parasteatoda tepidariorum (a
 *      cobweb spider, cited for pedipalp development) and Drosophila (prey).
 *      Those are not salticids and must never link to a species profile —
 *      which follows automatically from rule 1, since we only profile
 *      jumping spiders.
 *
 * Abbreviated forms are matched too: writing "P. regius" after a full mention
 * of "Phidippus regius" links the same way.
 */

export interface SpeciesLinkTarget {
  slug: string;
  scientificName: string;
  commonName: string;
  aliases: string[];
}

const SKIP_ELEMENTS = new Set([
  'a',
  'code',
  'pre',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'script',
  'style',
]);

interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  children?: HastNode[];
  properties?: Record<string, unknown>;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Every phrase that should point at a given profile, longest first so that
 * "Phidippus regius" wins over a bare "Phidippus" from another entry.
 */
function phrasesFor(species: SpeciesLinkTarget[]): { phrase: string; slug: string }[] {
  const out: { phrase: string; slug: string }[] = [];

  for (const entry of species) {
    const forms = new Set<string>([entry.scientificName, entry.commonName, ...entry.aliases]);

    // "Phidippus regius" -> "P. regius", the conventional short form.
    const parts = entry.scientificName.split(/\s+/);
    if (parts.length === 2 && parts[0].length > 1) {
      forms.add(`${parts[0][0]}. ${parts[1]}`);
    }

    for (const phrase of forms) {
      if (phrase.trim().length > 2) out.push({ phrase: phrase.trim(), slug: entry.slug });
    }
  }

  return out.sort((a, b) => b.phrase.length - a.phrase.length);
}

export default function rehypeSpecies(options: { species?: SpeciesLinkTarget[] } = {}) {
  const species = options.species ?? [];

  return (tree: HastNode, file?: { data?: Record<string, unknown> }) => {
    if (species.length === 0) return;

    const phrases = phrasesFor(species);
    const linked = new Set<string>();

    // A species profile should not link to itself. Astro exposes the source
    // path on the vfile, which is enough to identify the page being rendered.
    const path = String(
      (file?.data?.astro as { fileURL?: string } | undefined)?.fileURL ?? file?.data?.filePath ?? '',
    );
    const selfSlug = /content\/species\/([^./]+)\./.exec(path)?.[1];
    if (selfSlug) linked.add(selfSlug);

    const walk = (node: HastNode) => {
      if (!node.children) return;
      const next: HastNode[] = [];

      for (const child of node.children) {
        if (child.type === 'element') {
          if (!SKIP_ELEMENTS.has(child.tagName ?? '')) walk(child);
          next.push(child);
          continue;
        }

        if (child.type !== 'text' || !child.value) {
          next.push(child);
          continue;
        }

        let best: { index: number; length: number; slug: string } | null = null;

        for (const { phrase, slug } of phrases) {
          if (linked.has(slug)) continue;
          const re = new RegExp(`\\b${escape(phrase)}\\b`, 'i');
          const match = re.exec(child.value);
          if (!match) continue;
          if (
            best === null ||
            match.index < best.index ||
            (match.index === best.index && match[0].length > best.length)
          ) {
            best = { index: match.index, length: match[0].length, slug };
          }
        }

        if (!best) {
          next.push(child);
          continue;
        }

        const before = child.value.slice(0, best.index);
        const matched = child.value.slice(best.index, best.index + best.length);
        const after = child.value.slice(best.index + best.length);

        linked.add(best.slug);

        if (before) next.push({ type: 'text', value: before });
        next.push({
          type: 'element',
          tagName: 'a',
          properties: {
            href: `/species/${best.slug}`,
            className: ['species-link'],
          },
          children: [{ type: 'text', value: matched }],
        });
        if (after) next.push(...remainder(after));
      }

      node.children = next;
    };

    const remainder = (value: string): HastNode[] => {
      const holder: HastNode = { type: 'element', children: [{ type: 'text', value }] };
      walk(holder);
      return holder.children ?? [];
    };

    walk(tree);
  };
}
