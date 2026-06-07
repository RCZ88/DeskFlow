const fs = require('fs');
const path = require('path');

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.name.endsWith('.cjs')) files.push(full);
  }
  return files;
}

for (const file of walk('dist-electron')) {
  const content = fs.readFileSync(file, 'utf8');
  const updated = content.replace(/require\("\.\/([^".]+)"\)/g, 'require("./$1.cjs")');
  if (updated !== content) {
    fs.writeFileSync(file, updated);
    console.log('Fixed:', path.relative('dist-electron', file).replace(/\\/g, '/'));
  }
}
