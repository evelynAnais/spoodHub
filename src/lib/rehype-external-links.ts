/**
 * Makes links written in Markdown behave like the hand-written ones in the
 * layout: external links open in a new tab, carry `rel="noopener noreferrer"`,
 * and get a marker.
 *
 * Markdown has no syntax for a link target, so `[PECKHAMIA](https://…)` in a
 * care guide rendered as a bare `<a href>` and navigated away from the site,
 * while the identical link in the Sources component opened a new tab. Same
 * page, same destination, different behaviour — purely because one was authored
 * in Markdown.
 *
 * Doing it here fixes every contributor's links at once, and avoids asking
 * anyone to write raw HTML — which rehype-sanitize would strip anyway.
 *
 * Internal links are untouched, so glossary and species auto-links keep
 * behaving as ordinary in-page navigation.
 */

interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  children?: HastNode[];
  properties?: Record<string, unknown>;
}

const isExternal = (href: string) => /^https?:\/\//i.test(href);

/** Links straight to a file: clicking downloads rather than opening a page. */
const isDocument = (href: string) => /\.(pdf|docx?|zip|csv|xlsx?)(\?|#|$)/i.test(href);

export default function rehypeExternalLinks() {
  return (tree: HastNode) => {
    const walk = (node: HastNode) => {
      if (!node.children) return;

      for (const child of node.children) {
        if (child.type === 'element' && child.tagName === 'a') {
          const href = String(child.properties?.href ?? '');

          if (isExternal(href)) {
            const doc = isDocument(href);

            child.properties = {
              ...child.properties,
              target: '_blank',
              rel: 'noopener noreferrer',
            };

            child.children = [
              ...(child.children ?? []),
              {
                type: 'element',
                tagName: 'span',
                properties: { className: ['link-marker'], 'aria-hidden': 'true' },
                children: [{ type: 'text', value: doc ? ' ↓PDF' : ' ↗' }],
              },
              {
                type: 'element',
                tagName: 'span',
                properties: { className: ['sr-only'] },
                children: [
                  {
                    type: 'text',
                    value: doc ? ' (PDF, opens in a new tab)' : ' (opens in a new tab)',
                  },
                ],
              },
            ];
          }
        }

        walk(child);
      }
    };

    walk(tree);
  };
}
