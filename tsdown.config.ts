import { promisify } from 'node:util';
import { exec as execCallback } from 'node:child_process';
import type { ExecException } from 'node:child_process';
import { defineConfig } from 'tsdown';

const exec = promisify(execCallback);

export default defineConfig(() => ({
  entry: ['src/index.ts'],
  target: 'node20',
  minify: true,
  hooks(hooks) {
    hooks.hook('build:done', async () => {
      console.log(
        'tsdown build:done - building dynamically imported configuration scripts'
      );
      try {
        const { stdout } = await exec('pnpm run build:scripts');
        console.log('scripts were built succesfully.');
        if (stdout) {
          console.log(stdout);
        }
      } catch (error) {
        const e = error as ExecException & { stdout: string; stderr: string };
        console.log('building scripts returned with an error:');
        if (e.stdout) {
          console.log(e.stdout);
        }
        if (e.stderr) {
          console.log(e.stderr);
        }
      }
    });
  },
}));
