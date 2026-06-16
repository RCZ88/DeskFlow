const fs = require('fs');
const path = require('path');
const content = [
  '"use strict";',
  'Object.defineProperty(exports, "__esModule", { value: true });',
  'exports.getAgentConfig = void 0;',
  'exports.detectAgentPrompt = void 0;',
  'Object.defineProperties(exports, {',
  "  getAgentConfig: { get: () => require('./main.cjs').getAgentConfig },",
  "  detectAgentPrompt: { get: () => require('./main.cjs').detectAgentPrompt },",
  '});',
  '',
].join('\n');
fs.writeFileSync(path.join(__dirname, '..', 'dist-electron', 'main.js'), content);
