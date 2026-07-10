import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const SRC = resolve(ROOT, 'src');
const OUT = resolve(ROOT, 'dist-electron');

const cjsShimTargets = [
  'services/AIService.js',
  'services/SkillDSLParser.js',
  'services/providers/router.js',
  'services/providers/templates.js',
  'services/providers/callProvider.js',
  'services/providers/providerLog.js',
  'services/ProblemsService.js',
  'services/RequestsService.js',
  'services/SkillsService.js',
  'services/AgentHostService.js',
  'gameDetection.js',
];

for (const jsFile of cjsShimTargets) {
  const tsFile = resolve(SRC, jsFile.replace(/\.js$/, '.ts'));
  const absOut = resolve(OUT, jsFile);
  if (existsSync(tsFile)) {
    mkdirSync(dirname(absOut), { recursive: true });
    console.log('Compiling', jsFile);
    execSync(`npx esbuild "${tsFile}" --outfile="${absOut}" --format=cjs --platform=node --target=node22`, { cwd: ROOT, stdio: 'inherit', shell: true });
  } else {
    console.log('SKIP (not found):', tsFile);
  }
}

for (const jsFile of cjsShimTargets) {
  const cjsFile = jsFile.replace(/\.js$/, '.cjs');
  const jsPath = resolve(OUT, jsFile);
  if (existsSync(jsPath)) {
    writeFileSync(resolve(OUT, cjsFile), `module.exports = require('./${jsFile.replace(/^.*\//, '')}');\n`);
    console.log('Shim:', cjsFile);
  }
}
console.log('Done compiling services');
