// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

import rehypeGlossary from './src/lib/rehype-glossary.ts';

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
        "connect-src 'self'",
        "manifest-src 'self'",
        "worker-src 'self'",
        "base-uri 'none'",
        "form-action 'none'",
        "object-src 'none'",
      ],
    },
  },

  markdown: {
    // Order matters. Sanitize the contributor's HTML first, then let our own
    // trusted plugin add glossary links — otherwise sanitizing would strip the
    // links we just added.
    rehypePlugins: [[rehypeSanitize, sanitizeSchema], rehypeGlossary],

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
