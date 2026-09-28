import { defineConfig } from 'vitest/config';

export default defineConfig({
  server: { fs: { allow: ['../..'] } },
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    // Vitest stubs *.css imports to an empty module by default (even with
    // `?raw`, since its css-disable plugin matches on the `.css` extension
    // alone). Opt the raw CSS-token pin (theme.test.ts) back into real
    // processing so `?raw` actually returns the file's text.
    css: { include: [/\?raw$/] },
  },
});
