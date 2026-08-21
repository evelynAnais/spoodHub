// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

import rehypeGlossary from './src/lib/rehype-glossary.ts';

// https://astro.build/config
export default defineConfig({
  integrations: [react(), mdx()],

  markdown: {
    // Links the first mention of each glossary term in every care guide and
    // species profile. The MDX integration inherits this config by default.
    rehypePlugins: [rehypeGlossary]
  },

  vite: {
    plugins: [tailwindcss()]
  }
});