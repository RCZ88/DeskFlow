const fs = require('fs');
let content = fs.readFileSync('src/preload.ts', 'utf8');

// Strategy: insert \r\n before every // AND before every top-level statement
// that follows a comment. We detect "code boundaries" by looking for
// specific patterns.

let inSingle = false, inDouble = false, inTemplate = false;
let result = '';
let i = 0;
let prevIsNewline = true; // start of file counts as "after newline"

function addChar(ch) {
  result += ch;
}

function addNewline() {
  result += '\r\n';
  prevIsNewline = true;
}

while (i < content.length) {
  let ch = content[i];
  let next = content[i+1] || '';
  let prev = content[i-1] || '';
  
  // Track string boundaries to avoid splitting inside strings
  if (ch === '"' && prev !== '\\' && !inSingle && !inTemplate) {
    inDouble = !inDouble;
  }
  if (ch === "'" && prev !== '\\' && !inDouble && !inTemplate) {
    inSingle = !inSingle;
  }
  if (ch === '`' && prev !== '\\' && !inSingle && !inDouble) {
    inTemplate = !inTemplate;
  }
  
  if (!inSingle && !inDouble && !inTemplate) {
    // Outside strings - apply transformations
    
    // Before //: insert newline (so // starts a new comment line)
    if (ch === '/' && next === '/') {
      addNewline();
      addChar(ch);
      i++;
      addChar(content[i]);
      i++;
      prevIsNewline = false;
      continue;
    }
    
    // A semicolon (;) at end-of-statement: add newline after it
    if (ch === ';') {
      addChar(';');
      // Only add newline if followed by non-comment, non-whitespace
      // or if this ends the import statement
      i++;
      // Skip any spaces
      let j = i;
      while (j < content.length && (content[j] === ' ' || content[j] === '\t')) j++;
      if (j < content.length && content[j] === '/') {
        // Followed by // - let the // handler deal with it
        // Don't add extra newline
      } else if (j < content.length && content[j] !== ',') {
        // Followed by code - add newline after semicolon  
        addNewline();
      }
      prevIsNewline = false;
      continue;
    }
    
    // Opening brace { at top level: add newline after it
    if (ch === '{') {
      addChar('{');
      i++;
      // Check if followed by // 
      let j = i;
      while (j < content.length && (content[j] === ' ' || content[j] === '\t')) j++;
      if (j < content.length && content[j] === '/') {
        // Next is a // comment - add newline so comment starts on next line
        addNewline();
      }
      prevIsNewline = false;
      continue;
    }
    
    // Closing brace } followed by , or ) and more code: add newline
    if (ch === '}') {
      addChar('}');
      i++;
      let peek = content[i] || '';
      if (peek === ',') {
        addChar(',');
        i++;
        // Skip spaces, check if more code follows
        let j = i;
        while (j < content.length && (content[j] === ' ' || content[j] === '\t')) j++;
        if (j < content.length && (content[j] === '/' || 
            (content[j] >= 'a' && content[j] <= 'z') ||
            (content[j] >= 'A' && content[j] <= 'Z'))) {
          addNewline();
        }
      } else if (peek === ')') {
        // end of exposeInMainWorld call
        addChar(')');
        i++;
        addChar(';');
        i++;
        addNewline();
      }
      prevIsNewline = false;
      continue;
    }
    
    // Comma followed by // or identifier (property/comma separator)
    if (ch === ',') {
      addChar(',');
      i++;
      let j = i;
      while (j < content.length && (content[j] === ' ' || content[j] === '\t')) j++;
      if (j < content.length && content[j] === '/') {
        addNewline();
      } else if (j < content.length && content[j] !== ' ') {
        addNewline();
      }
      prevIsNewline = false;
      continue;
    }
  }
  
  addChar(ch);
  prevIsNewline = false;
  i++;
}

fs.writeFileSync('src/preload.ts', result, 'utf8');
console.log('Done. Length: ' + result.length);
