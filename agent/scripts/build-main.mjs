import { build } from 'vite';
import { resolve } from 'node:path';
import { existsSync, statSync, renameSync, rmSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const ROOT = resolve(process.cwd());
const OUT = resolve(ROOT, 'dist-electron');
const mainTemp = resolve(OUT, 'main-temp');
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
mkdirSync(mainTemp, { recursive: true });
await build({
  root: ROOT,
  configFile: false,
  build: {
    outDir: mainTemp,
    lib: { entry: resolve(ROOT, 'src', 'main.ts'), formats: ['cjs'], fileName: () => 'main.cjs' },
    rollupOptions: {
      external: ['electron','better-sqlite3','active-win','node-pty','dotenv','ws','crypto','os','path','fs','child_process','util','url','stream','events','net','http','https','tls','zlib','assert','querystring','buffer'],
    },
    ssr: undefined,
    minify: false,
    sourcemap: false,
  },
});
const mainCjs = resolve(mainTemp, 'main.cjs');
if (existsSync(mainCjs)) {
  renameSync(mainCjs, resolve(OUT, 'main.cjs'));
  console.log('main: ' + (statSync(resolve(OUT, 'main.cjs')).size / 1024).toFixed(0) + ' KB');
}
if (existsSync(mainTemp)) rmSync(mainTemp, { recursive: true, force: true });
// package.json shim
writeFileSync(resolve(OUT, 'package.json'), JSON.stringify({ type: 'commonjs' }, null, 2) + '\n');
const content = readFileSync(resolve(OUT, 'main.cjs'), 'utf-8');
console.log('main.cjs built');
console.log('HAS async spawn promise wrapper:', content.includes('Transcription timed out after 2 minutes'));
console.log('spawnSync occurrences:', (content.match(/child_process_1\.spawnSync/g) || []).length);
