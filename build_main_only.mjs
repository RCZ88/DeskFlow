import { build as viteBuild } from 'vite';
import { resolve } from 'path';
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync, statSync } from 'fs';

const ROOT = resolve(import.meta.dirname);
const SRC = resolve(ROOT, 'src');
const OUT = resolve(ROOT, 'dist-electron');
const mainTemp = resolve(OUT, 'main-temp');

mkdirSync(mainTemp, { recursive: true });

try {
  await viteBuild({
    root: ROOT,
    configFile: false,
    build: {
      outDir: mainTemp,
      lib: {
        entry: resolve(SRC, 'main.ts'),
        formats: ['cjs'],
        fileName: () => 'main.cjs',
      },
      rollupOptions: {
        external: [
          'electron',
          'better-sqlite3',
          'active-win',
          'node-pty',
          'dotenv',
        ],
      },
      ssr: undefined,
      minify: false,
      sourcemap: false,
    },
  });

  const mainCjs = resolve(mainTemp, 'main.cjs');
  if (existsSync(mainCjs)) {
    renameSync(mainCjs, resolve(OUT, 'main.cjs'));
    const size = (statSync(resolve(OUT, 'main.cjs')).size / 1024).toFixed(0);
    console.log('main.cjs rebuilt: ' + size + ' KB');
  }
  if (existsSync(mainTemp)) rmSync(mainTemp, { recursive: true, force: true });
  writeFileSync(resolve(OUT, 'main.js'), 'module.exports = require("./main.cjs");\n');
  console.log('done');
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
