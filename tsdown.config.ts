import { exec } from 'node:child_process';
import { defineConfig } from 'tsdown';

export default defineConfig(() => ({
  entry: ['src/index.ts'],
  target: 'node20',
  minify: true,
  hooks(hooks) {
    hooks.hook('build:done', () => {
      console.log('tsdown build:done - running tsc');
      exec('tsc -p tsconfig.scripts.json');
    });
  },
}));
