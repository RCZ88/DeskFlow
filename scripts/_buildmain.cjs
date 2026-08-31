const { build } = require('vite');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.resolve(ROOT, 'dist-electron');
const SRC = path.resolve(ROOT, 'src');
const mainTemp = path.resolve(OUT, 'main-temp');
fs.mkdirSync(mainTemp, { recursive: true });
const log = (m) => fs.appendFileSync('/tmp/mainbuild.log', m + '\n');
fs.writeFileSync('/tmp/mainbuild.log', 'start ' + new Date().toISOString() + '\n');
build({
  root: ROOT,
  configFile: false,
  build: {
    outDir: mainTemp,
    lib: { entry: path.resolve(SRC, 'main.ts'), formats: ['cjs'], fileName: () => 'main.cjs' },
    rollupOptions: { external: ['electron','better-sqlite3','active-win','node-pty','dotenv','ws','crypto','os','path','fs','child_process','util','url','stream','events','net','http','https','tls','zlib','assert','querystring','buffer'] },
    ssr: undefined, minify: false, sourcemap: false,
  },
}).then(() => {
  const mainCjs = path.resolve(mainTemp, 'main.cjs');
  if (fs.existsSync(mainCjs)) {
    fs.renameSync(mainCjs, path.resolve(OUT, 'main.cjs'));
    fs.writeFileSync(path.resolve(OUT, 'main.js'), 'module.exports = require("./main.cjs");\n');
    fs.writeFileSync(path.resolve(OUT, 'package.json'), JSON.stringify({ type: 'commonjs' }, null, 2) + '\n');
    log('SUCCESS main: ' + (fs.statSync(path.resolve(OUT, 'main.cjs')).size/1024).toFixed(0) + ' KB');
  } else { log('NO main.cjs produced'); }
  try { fs.rmSync(mainTemp, { recursive: true, force: true }); } catch {}
  log('DONE ' + new Date().toISOString());
}).catch((e) => { log('ERROR: ' + (e && e.message) + '\n' + (e && e.stack || '')); });
