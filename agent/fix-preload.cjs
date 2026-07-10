const fs = require('fs');
let content = fs.readFileSync('src/preload.ts', 'utf8');

let result = '';
let inSingleQuoteString = false;
let inDoubleQuoteString = false;
let inTemplateString = false;
let i = 0;

while (i < content.length) {
    let ch = content[i];
    let next = content[i+1] || '';
    let prev = content[i-1] || '';
    
    if (ch === '"' && prev !== '\\' && !inSingleQuoteString && !inTemplateString) {
        inDoubleQuoteString = !inDoubleQuoteString;
    }
    if (ch === "'" && prev !== '\\' && !inDoubleQuoteString && !inTemplateString) {
        inSingleQuoteString = !inSingleQuoteString;
    }
    if (ch === '`' && prev !== '\\' && !inSingleQuoteString && !inDoubleQuoteString) {
        inTemplateString = !inTemplateString;
    }
    
    if (ch === '/' && next === '/' && !inSingleQuoteString && !inDoubleQuoteString && !inTemplateString) {
        result += '\r\n' + ch + next;
        i += 2;
        continue;
    }
    
    result += ch;
    i++;
}

fs.writeFileSync('src/preload.ts', result, 'utf8');
console.log('Done. Length: ' + result.length);
