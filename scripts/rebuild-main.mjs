import { build as viteBuild } from 'vite';
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const SRC = resolve(ROOT, 'src');
const OUT = resolve(ROOT, 'dist-electron');

async function main() {
  console.log('=== Rebuilding main.cjs (Vite library mode) ===');
  
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
        external: [
          'electron', 'better-sqlite3', 'active-win', 'node-pty',
          'dotenv', 'ws', 'crypto', 'os', 'path', 'fs',
          'child_process', 'util', 'url', 'stream', 'events',
          'net', 'http', 'https', 'tls', 'zlib', 'assert',
          'querystring', 'buffer',
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
    console.log(`  main.cjs: ${((await import('fs')).statSync(resolve(OUT, 'main.cjs')).size / 1024).toFixed(0)} KB`);
  }
  if (existsSync(mainTemp)) rmSync(mainTemp, { recursive: true, force: true });

  const content = readFileSync(resolve(OUT, 'main.cjs'), 'utf-8');
  if (content.includes('./services/') || content.includes('./gameDetection')) {
    console.log('  ✅ Services left as external require() (expected)');
  }

  console.log('✅ Build complete!');
}

main().catch((e) => {
  console.error('❌ Build failed:', e.message);
  process.exit(1);
});
