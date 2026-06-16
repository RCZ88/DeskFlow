const fs = require('fs');
const path = require('path');

const dist = path.resolve(__dirname, '..', 'dist-electron');

// Generate main.js as CJS-to-ESM bridge with lazy require (avoids circular dep)
// AgentHostService.cjs does require('../main') which resolves to main.js
// We defer require('./main.cjs') until first function call so the cycle
// (main.cjs -> AgentHostService.cjs -> main.js -> main.cjs) isn't a problem.
fs.writeFileSync(path.join(dist, 'main.js'), `\
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
export function getAgentConfig(agentType) {
  return require('./main.cjs').getAgentConfig(agentType);
}
export function detectAgentPrompt(dataBuffer, agentType) {
  return require('./main.cjs').detectAgentPrompt(dataBuffer, agentType);
}
`);

// Delete stale preload.js
const preloadJs = path.join(dist, 'preload.js');
if (fs.existsSync(preloadJs)) { fs.unlinkSync(preloadJs); }

// Copy service .js -> .cjs (where .cjs doesn't exist yet)
function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full).forEach(f => files.push(f));
    else files.push(full);
  }
  return files;
}

for (const js of walk(dist).filter(f => f.endsWith('.js'))) {
  if (js.endsWith(path.sep + 'main.js')) continue;
  const cjs = js.replace(/\.js$/, '.cjs');
  if (!fs.existsSync(cjs)) {
    fs.copyFileSync(js, cjs);
  }
}
