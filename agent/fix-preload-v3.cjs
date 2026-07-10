const fs = require('fs');
const content = fs.readFileSync('src/preload.ts', 'utf8');

// Track if we're inside a string
function stringState(content) {
  let inSingle = false, inDouble = false;
  return function(i) {
    const ch = content[i];
    const prev = i > 0 ? content[i-1] : '';
    if (ch === '"' && prev !== '\\' && !inSingle) inDouble = !inDouble;
    if (ch === "'" && prev !== '\\' && !inDouble) inSingle = !inSingle;
    return { inSingle, inDouble };
  };
}

// Phase 1: replace // with a token we can split on, but only when not in a string
let phase1 = '';
let state = stringState(content);
let i = 0;
while (i < content.length) {
  const ch = content[i];
  const next = content[i+1] || '';
  const s = state(i);
  // Outside strings, // starts a comment
  if (ch === '/' && next === '/' && !s.inSingle && !s.inDouble) {
    phase1 += '\r\n//';  // Newline before //, then start the comment
    i += 2;
    // Everything until end of file (or next //) is part of this comment
    // Since this is a single-line file, everything after // is the comment
    // We'll handle splitting comment from code in Phase 2
    continue;
  }
  phase1 += ch;
  i++;
}

// Phase 2: split // comment lines into comment + code
// Pattern on each line: "// [English text] code();"
// We need to find where the English text ends and code begins
let lines = phase1.split(/\r?\n/);
let resultLines = [];

for (let line of lines) {
  if (line.startsWith('//')) {
    // On a comment line, find where code starts after the comment text
    // The pattern: after the comment description, there's always code
    // Look for the first occurrence of known code-starting patterns
    // like ipcRenderer. onContextBridge. or a lowercase ident followed by ( or :
    
    let rest = line.substring(2); // After //
    // Find the boundary between comment and code.
    // English comment text typically ends with a word, then space(s), then code.
    // Code starts with: ipcRenderer, contextBridge, or a lowercase identifier.
    
    // Look for known method calls at the boundary
    let boundary = -1;
    let patterns = [
      'ipcRenderer.',
      'contextBridge.',
      'onForegroundChange:',
      'onTrackingHeartbeat:',
      'onBrowserTrackingEvent:',
      'onSleepDetection:',
      'getLogs:',
      'updateAppLog:',
      'deleteAppLog:',
      'getDashboardAggregates:',
      'getAllLogs:',
      'getLogStats:',
      'getAppUsageRanking:',
      'getProductivityTrend:',
      'getTimeSeries:',
      'logUserActivity:',
      'getTierAssignments:',
      'setTierAssignment:',
      'resetTierDefaults:',
      'savePreferences:',
      'getPreferences:',
      'getTheme:',
      'setTheme:',
      'onForegroundChange:',
      'onTrackingHeartbeat:',
      'onBrowserTrackingEvent:',
      'onSleepDetection:',
      'terminalWrite:',
    ];
    
    // Find the last // that's already in the line (from Phase 1 combining adjacent // comments)
    // Actually, Phase 1 put each // on a new line, so a line should only have one //
    // But the text after // can contain // inside strings
    
    // Look for first pattern match after the initial whitespace
    let minIdx = rest.length;
    for (let p of patterns) {
      let idx = rest.indexOf(p);
      if (idx !== -1 && idx < minIdx) {
        minIdx = idx;
        boundary = idx;
      }
    }
    
    if (boundary > 0) {
      // Split: comment text ends at boundary
      let commentText = rest.substring(0, boundary).trim();
      // Remove trailing spaces, punctuation
      commentText = commentText.replace(/[\s,;]+$/, '');
      let codePart = rest.substring(boundary);
      if (commentText) {
        resultLines.push('// ' + commentText);
      }
      resultLines.push(codePart.trimStart());
    } else {
      // No code boundary found - keep as comment only
      resultLines.push(line);
    }
  } else {
    if (line.trim()) {
      resultLines.push(line);
    }
  }
}

const output = resultLines.join('\r\n');
fs.writeFileSync('src/preload.ts', output, 'utf8');
console.log('Done. Lines: ' + resultLines.length + ', length: ' + output.length);
