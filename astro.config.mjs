// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

import rehypeExternalLinks from './src/lib/rehype-external-links.ts';
import rehypeGlossary from './src/lib/rehype-glossary.ts';
import rehypeSpecies from './src/lib/rehype-species.ts';
import { loadSpeciesIndex } from './src/lib/species-index.ts';

// Read once at config time; the linker only needs names and slugs.
const speciesIndex = loadSpeciesIndex();

/**
 * Care content arrives by pull request from people we do not know, and Astro
 * renders raw HTML inside Markdown by default. Without this, a contributor
 * could put `<script>` in a care guide and read every visitor's IndexedDB —
 * which on this site is their entire spider log.
 *
 * Sanitising is worth more here than on most sites precisely because the whole
 * point is accepting content from strangers.
 */
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    // Astro generates heading ids for anchor links; keep them.
    '*': [...(defaultSchema.attributes?.['*'] ?? []), 'id'],
  },
};

// https://astro.build/config
export default defineConfig({
  // Drives canonical URLs, the sitemap, and absolute Open Graph image URLs.
  // Must match the domain the site is actually served from, or search engines
  // are told the canonical page lives somewhere it does not.
  site: 'https://spoodhub.com',

  integrations: [react(), mdx(), sitemap()],

  security: {
    /**
     * Astro emits a few inline scripts of its own — island hydration and the
     * service worker registration — so a blanket `script-src 'self'` would
     * break the site. Rather than weaken the policy with 'unsafe-inline',
     * this generates a SHA-256 hash for each inline script and style and
     * emits them in a <meta http-equiv="content-security-policy"> tag.
     *
     * `script-src` and `style-src` are added automatically; everything below
     * is what we add on top. Note `frame-ancestors` is deliberately absent —
     * it is ignored in a meta tag, so it lives in `public/_headers` instead.
     */
    csp: {
      algorithm: 'SHA-256',
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        // Cloudflare Web Analytics posts its beacon here. The only third-party
        // origin the site talks to, and the reason for the script-src entry
        // below — the beacon is injected by Cloudflare at the edge, so it is
        // not something the build can hash.
        "connect-src 'self' https://cloudflareinsights.com",
        "manifest-src 'self'",
        "worker-src 'self'",
        "base-uri 'none'",
        "form-action 'none'",
        "object-src 'none'",
      ],
      scriptDirective: {
        /**
         * `resources` REPLACES the default sources rather than adding to them,
         * so `'self'` has to be listed explicitly. Omitting it drops `'self'`
         * from script-src entirely and the tracker island stops loading — it
         * pulls /_astro/TrackerApp.*.js in by dynamic import, which script-src
         * governs.
         *
         * The Cloudflare entry is for the Web Analytics beacon, which is
         * injected at the edge and therefore cannot be hashed at build time.
         */
        resources: ["'self'", 'https://static.cloudflareinsights.com'],
      },
    },
  },

  markdown: {
    // Order matters. Sanitize the contributor's HTML first, then let our own
    // trusted plugin add glossary links — otherwise sanitizing would strip the
    // links we just added.
    // Order matters throughout:
    //   1. sanitize contributor HTML first
    //   2. link species names — done before the glossary so that a phrase like
    //      "Phidippus regius" is claimed by the species linker rather than
    //      being broken up by a glossary term inside it
    //   3. link glossary terms in whatever text remains
    rehypePlugins: [
      [rehypeSanitize, sanitizeSchema],
      [rehypeSpecies, { species: speciesIndex }],
      rehypeGlossary,
      // Last, so it also catches the internal-vs-external decision correctly
      // for links the two plugins above just created (they are internal, so it
      // leaves them alone).
      rehypeExternalLinks,
    ],

    // Off because nothing uses it — no care guide contains a code block, and
    // Astro's default highlighter (Shiki) colors code with inline `style=`
    // attributes that a CSP hash cannot cover, which would force
    // `style-src 'unsafe-inline'`. If a guide ever needs a code block, set
    // this to 'prism' instead: it uses CSS classes and stays CSP-safe.
    syntaxHighlight: false,
  },

  vite: {
    plugins: [tailwindcss()],
  },
});
