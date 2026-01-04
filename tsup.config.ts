import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli/index.ts'],
  format: ['esm'],
  dts: true,
  external: [
    // Tutti i package workspace
    /^@onecoach\//,
    // Prisma
    '@prisma/client',
    /^@prisma\/client/,
    // Node built-ins
    /^node:/,
  ],
  noExternal: [],
  clean: true,
  sourcemap: false,
  splitting: false,
  treeshake: true,
});
