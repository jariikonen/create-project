import { readdirSync } from 'node:fs';
import { defineConfig } from 'tsdown';
import tsconfigPaths from 'rollup-plugin-tsconfig-paths';
import { join } from 'path';

const scriptsDir = 'configurationScripts';
const scripts = readdirSync(scriptsDir).map((file) => join(scriptsDir, file));

export default defineConfig({
  entry: scripts,
  outDir: 'dist/configurationScripts',
  dts: false,
  tsconfig: 'tsconfig.scripts.json',
  plugins: [tsconfigPaths()],
});
