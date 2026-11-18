import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  sourcemap: true,
  clean: true,
  // Workspace packages ship TypeScript source, so bundle them into the server build.
  noExternal: [/^@werewolf\//],
});
