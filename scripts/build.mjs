import { build as viteBuild } from 'vite';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'fs';
import { resolve, dirname, relative } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const SRC = resolve(ROOT, 'src');
const OUT = resolve(ROOT, 'dist-electron');
const PRELOAD_TEMP = resolve(OUT, 'preload-temp');

function run(desc, cmd) {
  console.log(`\n=== ${desc} ===`);
  execSync(cmd, { cwd: ROOT, stdio: 'inherit', shell: true });
}

function esbuildCompile(tsFile, outFile) {
  const absOut = resolve(OUT, outFile);
  mkdirSync(dirname(absOut), { recursive: true });
  execSync(
    `npx esbuild "${tsFile}" --outfile="${absOut}" --format=cjs --platform=node --target=node22`,
    { cwd: ROOT, stdio: 'inherit', shell: true }
  );
  return absOut;
}

function findAllTs(dir) {
  const result = [];
  function walk(d) {
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = resolve(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.ts') && !e.name.endsWith('.d.ts') && !e.name.endsWith('.test.ts') && !e.name.endsWith('.spec.ts')) result.push(p);
    }
  }
  walk(dir);
  return result;
}

async function main() {
  // Step 1: Renderer
  run('Step 1/4: Building renderer', 'npx vite build');

  // Step 2: Preload
  run('Step 2/4: Building preload', `npx vite build --ssr src/preload.ts --outDir "${PRELOAD_TEMP}"`);
  const preloadSrc = resolve(PRELOAD_TEMP, 'assets/preload.js');
  if (existsSync(preloadSrc)) renameSync(preloadSrc, resolve(OUT, 'preload.mjs'));
  if (existsSync(PRELOAD_TEMP)) rmSync(PRELOAD_TEMP, { recursive: true, force: true });
  console.log(`  preload: ${(statSync(resolve(OUT, 'preload.mjs')).size / 1024).toFixed(0)} KB`);

  // Step 3: Pre-compile ALL .ts service files to .js (individual files, NOT bundled)
  console.log('\n=== Step 3/4: Pre-compiling services ===');
  const serviceFiles = findAllTs(resolve(SRC, 'services'));
  const gameDetectionFile = resolve(SRC, 'gameDetection.ts');
  const allTsFiles = [gameDetectionFile, ...serviceFiles].filter(f => existsSync(f));

  for (const tsFile of allTsFiles) {
    const rel = relative(SRC, tsFile).replace(/\.ts$/, '.js');
    esbuildCompile(tsFile, rel);
    const absOut = resolve(OUT, rel);
    console.log(`  ${relative(SRC, tsFile)} → ${rel} (${(statSync(absOut).size / 1024).toFixed(0)} KB)`);
  }

  // Create .cjs shims for files required as .cjs by main.ts
  const cjsShimTargets = [
    'services/AIService.js',
    'services/SkillDSLParser.js',
    'services/providers/router.js',
    'services/providers/templates.js',
    'services/providers/callProvider.js',
    'services/ProblemsService.js',
    'services/RequestsService.js',
    'services/SkillsService.js',
    'services/AgentHostService.js',
    'gameDetection.js',
  ];
  for (const jsFile of cjsShimTargets) {
    const cjsFile = jsFile.replace(/\.js$/, '.cjs');
    if (existsSync(resolve(OUT, jsFile))) {
      writeFileSync(resolve(OUT, cjsFile), `module.exports = require('./${jsFile.replace(/^.*\//, '')}');\n`);
      console.log(`  ${cjsFile} → shim re-exporting ${jsFile}`);
    }
  }

  // Step 4: Build main process in library mode (services externalized)
  console.log('\n=== Step 4/4: Building main process entry (Vite library mode) ===');
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
    console.log(`  main: ${(statSync(resolve(OUT, 'main.cjs')).size / 1024).toFixed(0)} KB`);
  }
  if (existsSync(mainTemp)) rmSync(mainTemp, { recursive: true, force: true });

  // Create a main.js shim so require('../main') from services resolves
  writeFileSync(resolve(OUT, 'main.js'), 'module.exports = require("./main.cjs");\n');
  console.log(`  main.js shim created`);

  // Create dist-electron/package.json with "type": "commonjs"
  writeFileSync(resolve(OUT, 'package.json'), JSON.stringify({ type: 'commonjs' }, null, 2) + '\n');
  console.log(`  package.json (commonjs) created`);

  // Verify
  const content = readFileSync(resolve(OUT, 'main.cjs'), 'utf-8');
  if (content.includes('./services/') || content.includes('./gameDetection')) {
    console.log('\n  ✅ Services left as external require() (expected)');
  }

  console.log('\n✅ Build complete!');
}

main().catch((e) => {
  console.error('\n❌ Build failed:', e.message);
  process.exit(1);
});
