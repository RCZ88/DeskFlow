import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, 'dist');
const zipPath = join(outDir, 'src.zip');

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

execSync(
  `powershell -Command "Compress-Archive -Path '${root}\\src\\*', '${root}\\scripts\\*', '${root}\\agent\\*' -DestinationPath '${zipPath}' -Force"`,
  { cwd: root, stdio: 'inherit' }
);

console.log(`Zipped source to ${zipPath}`);
