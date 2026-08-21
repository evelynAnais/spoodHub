import { glossaryPhrases } from './glossary.ts';

/**
 * Auto-links the first mention of each glossary term in every Markdown guide.
 *
 * Doing this by hand would rot the moment a guide is edited or added, and a
 * contributor writing a care sheet should not have to know the glossary exists.
 *
 * Rules, all of them chosen to keep the prose readable:
 *   - only the FIRST mention of a term per page is linked; after that the
 *     reader knows the word and repeated links are just noise
 *   - never inside headings, code, or an existing link
 *   - longest phrase wins, so "penultimate molt" does not match as "molt"
 *   - matching is case-insensitive but the author's original text is preserved
 */

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

/** Escapes a phrase for use inside a RegExp. */
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default function rehypeGlossary() {
  return (tree: HastNode) => {
    const phrases = glossaryPhrases();
    const linked = new Set<string>();

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

        // Find the earliest match among terms not yet linked on this page.
        let best: { index: number; length: number; anchor: string } | null = null;

        for (const { phrase, anchor } of phrases) {
          if (linked.has(anchor)) continue;
          const re = new RegExp(`\\b${escape(phrase)}\\b`, 'i');
          const match = re.exec(child.value);
          if (!match) continue;
          if (
            best === null ||
            match.index < best.index ||
            // Same position: prefer the longer phrase.
            (match.index === best.index && match[0].length > best.length)
          ) {
            best = { index: match.index, length: match[0].length, anchor };
          }
        }

        if (!best) {
          next.push(child);
          continue;
        }

        const before = child.value.slice(0, best.index);
        const matched = child.value.slice(best.index, best.index + best.length);
        const after = child.value.slice(best.index + best.length);

        linked.add(best.anchor);

        if (before) next.push({ type: 'text', value: before });
        next.push({
          type: 'element',
          tagName: 'a',
          properties: {
            href: `/classification#${best.anchor}`,
            className: ['glossary-link'],
            title: 'See the glossary',
          },
          children: [{ type: 'text', value: matched }],
        });
        // Re-process the remainder so a second term in the same text node is
        // still eligible.
        if (after) next.push(...splitRemainder(after));
      }

      node.children = next;
    };

    /** Runs the remaining text back through `walk`, which closes over the
     *  same `phrases` list and `linked` set, so first-mention-only still holds
     *  across a text node containing two different terms. */
    const splitRemainder = (value: string): HastNode[] => {
      const holder: HastNode = { type: 'element', children: [{ type: 'text', value }] };
      walk(holder);
      return holder.children ?? [];
    };

    walk(tree);
  };
}
