import { build as viteBuild } from 'vite';
import { existsSync, mkdirSync, renameSync, rmSync, statSync, writeFileSync, readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const SRC = resolve(ROOT, 'src');
const OUT = resolve(ROOT, 'dist-electron');
const mainTemp = resolve(OUT, 'main-temp');

mkdirSync(mainTemp, { recursive: true });

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
      external: ['electron', 'better-sqlite3', 'active-win', 'node-pty', 'dotenv'],
    },
    ssr: undefined,
    minify: false,
    sourcemap: false,
  },
});

const mainCjs = resolve(mainTemp, 'main.cjs');
if (existsSync(mainCjs)) {
  renameSync(mainCjs, resolve(OUT, 'main.cjs'));
  console.log(`main.cjs: ${(statSync(resolve(OUT, 'main.cjs')).size / 1024).toFixed(0)} KB`);
}
if (existsSync(mainTemp)) rmSync(mainTemp, { recursive: true, force: true });

writeFileSync(resolve(OUT, 'main.js'), 'module.exports = require("./main.cjs");\n');
writeFileSync(resolve(OUT, 'package.json'), JSON.stringify({ type: 'commonjs' }, null, 2) + '\n');

const content = readFileSync(resolve(OUT, 'main.cjs'), 'utf-8');
if (content.includes('./services/') || content.includes('./gameDetection')) {
  console.log('✅ Services externalized');
}
console.log('✅ main.cjs built');
