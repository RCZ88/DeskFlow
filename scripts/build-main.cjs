const { build } = require('vite');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve('.');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'dist-electron');
const mainTemp = path.join(OUT, 'main-temp');

fs.mkdirSync(mainTemp, { recursive: true });

build({
  root: ROOT,
  configFile: false,
  build: {
    outDir: mainTemp,
    lib: { entry: path.join(SRC, 'main.ts'), formats: ['cjs'], fileName: () => 'main.cjs' },
    rollupOptions: { external: ['electron','better-sqlite3','active-win','node-pty','dotenv','ws','crypto','os','path','fs','child_process','util','url','stream','events','net','http','https','tls','zlib','assert','querystring','buffer'] },
    ssr: undefined, minify: false, sourcemap: false,
  },
}).then(() => {
  const src = path.join(mainTemp, 'main.cjs');
  const dst = path.join(OUT, 'main.cjs');
  if (fs.existsSync(src)) { fs.renameSync(src, dst); console.log('main.cjs:', (fs.statSync(dst).size/1024).toFixed(0), 'KB'); }
  fs.rmSync(mainTemp, { recursive: true, force: true });
  fs.writeFileSync(path.join(OUT, 'main.js'), 'module.exports = require("./main.cjs");\n');
  fs.writeFileSync(path.join(OUT, 'package.json'), JSON.stringify({ type: 'commonjs' }, null, 2) + '\n');
  console.log('shims created');
}).catch(e => console.error('FAIL:', e.message));
