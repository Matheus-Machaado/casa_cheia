import { defineConfig } from 'astro/config';
import solid from '@astrojs/solid-js';
import netlify from '@astrojs/netlify';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://casacheia.netlify.app',
  output: 'static',
  adapter: netlify(),
  integrations: [solid()],
  vite: {
    plugins: [tailwindcss()],
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
});
