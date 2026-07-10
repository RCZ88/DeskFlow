const fs = require('fs');
const content = fs.readFileSync('src/preload.ts', 'utf8');

// Build pattern list from regex match on the file
const propNames = [
  ...content.matchAll(/(?<=[\s\{,;])(on\w+|get\w+|set\w+|save\w+|delete\w+|reset\w+|backfill\w+|compact\w+|build\w+|export\w+|import\w+|open\w+|close\w+|terminal\w+)(?=\s*:)/g)
].map(m => m[1]);
const uniqueProps = [...new Set(propNames)];
uniqueProps.sort((a,b) => b.length - a.length); // longest first

// Phase 1: replace // with \r\n//
let phase1 = '';
let inSingle = false, inDouble = false;
for (let i = 0; i < content.length; i++) {
  const ch = content[i];
  const next = i + 1 < content.length ? content[i+1] : '';
  const prev = i > 0 ? content[i-1] : '';
  if (ch === '"' && prev !== '\\' && !inSingle) inDouble = !inDouble;
  if (ch === "'" && prev !== '\\' && !inDouble) inSingle = !inSingle;
  if (ch === '/' && next === '/' && !inSingle && !inDouble) {
    phase1 += '\r\n//';
    i += 2;
    // Copy the rest of the comment line (everything until another // or end of file)
    let commentText = '';
    while (i < content.length) {
      const c = content[i];
      if (c === '/' && i + 1 < content.length && content[i+1] === '/') {
        // Another // starts - split here
        phase1 += '\r\n//';
        i++; // skip first /
        break;
      }
      commentText += c;
      i++;
    }
    phase1 += commentText;
    continue;
  }
  phase1 += ch;
}

// Phase 2: For each // comment line, find where code starts after the comment
// Use a comprehensive list of code-starting patterns
const codeStarters = [
  'ipcRenderer.',
  'contextBridge.',
  ...uniqueProps.map(p => p + ':')
];
// Sort longest first to match specific before general
codeStarters.sort((a,b) => b.length - a.length);

const lines = phase1.split(/\r?\n/);
const resultLines = [];

for (const line of lines) {
  if (line.trim().startsWith('//')) {
    const trimmed = line.trim();
    const commentContent = trimmed.substring(2).trimStart();
    
    // Find the first code starter in the comment content
    let bestMatch = -1;
    let bestPattern = '';
    for (const p of codeStarters) {
      const idx = commentContent.indexOf(p);
      if (idx !== -1 && (bestMatch === -1 || idx < bestMatch)) {
        bestMatch = idx;
        bestPattern = p;
      }
    }
    
    if (bestMatch > 0) {
      // We found code after the comment
      const commentPart = commentContent.substring(0, bestMatch).replace(/\s+$/, '');
      const codePart = commentContent.substring(bestMatch);
      if (commentPart) {
        resultLines.push('// ' + commentPart);
      }
      resultLines.push(codePart.trimStart());
    } else {
      // No code found on this comment line - it's a standalone comment
      resultLines.push(trimmed);
    }
  } else {
    resultLines.push(line);
  }
}

const output = resultLines.join('\r\n');
fs.writeFileSync('src/preload.ts', output, 'utf8');
console.log('Done. Lines: ' + resultLines.length + ', chars: ' + output.length);
