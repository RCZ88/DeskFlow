import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

function loadEnv() {
  const envPath = resolve(projectRoot, '.env');
  if (!existsSync(envPath)) return {};
  const content = readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
  return env;
}

const cfg = {
  '21st-dev': {
    cmd: 'npx', args: ['-y', '@21st-dev/magic@latest'],
    envMap: { API_KEY: 'TWENTY_FIRST_API_KEY' }
  },
  'unsplash': {
    cmd: 'npx', args: ['-y', 'unsplash-smart-mcp-server'],
    envMap: { UNSPLASH_ACCESS_KEY: 'UNSPLASH_ACCESS_KEY' }
  },
};

const name = process.argv[2];
const conf = cfg[name];
if (!conf) {
  console.error(`[mcp-launcher] unknown server: ${name}`);
  process.exit(1);
}

const envFile = loadEnv();
const childEnv = { ...process.env };
for (const [serverVar, envKey] of Object.entries(conf.envMap)) {
  if (envFile[envKey]) childEnv[serverVar] = envFile[envKey];
}

const child = spawn(conf.cmd, conf.args, {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: childEnv,
});

child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);
process.stdin.pipe(child.stdin);

child.on('exit', (code) => process.exit(code ?? 0));
