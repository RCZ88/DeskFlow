import { spawn, ChildProcess } from 'child_process';
import { Mutex } from 'async-mutex';

export interface InstallResult {
  success: boolean;
  stdout: string;
  stderr: string;
  installedPaths: string[];
  exitCode: number | null;
}

const installMutex = new Mutex();
const INSTALL_TIMEOUT_MS = 120000; // 2 minutes
const LOCK_TIMEOUT_MS = 10000;

function parseInstalledPaths(stdout: string): string[] {
  const paths: string[] = [];
  const lines = stdout.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('✓') || trimmed.startsWith('+') || trimmed.includes('installed')) {
      const match = trimmed.match(/(?:src\/|components\/|lib\/)[\w\-\/]+\.\w+/);
      if (match) paths.push(match[0]);
    }
    if (trimmed.match(/\.(tsx?|jsx?|css|json)$/)) {
      paths.push(trimmed);
    }
  }
  return [...new Set(paths)];
}

export async function installComponent(
  registryUrl: string,
  projectPath: string
): Promise<InstallResult> {
  const acquired = await installMutex.acquire({ timeout: LOCK_TIMEOUT_MS });
  if (!acquired) {
    return {
      success: false,
      stdout: '',
      stderr: 'Another install is in progress. Please wait.',
      installedPaths: [],
      exitCode: null,
    };
  }

  try {
    const result = await new Promise<InstallResult>((resolve) => {
      const proc = spawn('npx', ['shadcn@latest', 'add', registryUrl, '--yes'], {
        cwd: projectPath,
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'development' },
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      const timer = setTimeout(() => {
        proc.kill('SIGTERM');
        resolve({
          success: false,
          stdout,
          stderr: stderr + '\nInstall timed out after 2 minutes.',
          installedPaths: [],
          exitCode: null,
        });
      }, INSTALL_TIMEOUT_MS);

      proc.on('close', (code) => {
        clearTimeout(timer);
        const isNetworkError = stderr.includes('ENOTFOUND') || stderr.includes('ECONNREFUSED') ||
          stderr.includes('fetch failed') || stderr.includes('network');
        const isPermissionError = stderr.includes('EACCES') || stderr.includes('permission');

        resolve({
          success: code === 0 && !isNetworkError && !isPermissionError,
          stdout,
          stderr: isNetworkError ? 'Network error. Check your internet connection.' :
            isPermissionError ? 'Permission denied. Check file permissions.' : stderr,
          installedPaths: code === 0 ? parseInstalledPaths(stdout) : [],
          exitCode: code,
        });
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          success: false,
          stdout,
          stderr: `Failed to start process: ${err.message}`,
          installedPaths: [],
          exitCode: null,
        });
      });
    });

    return result;
  } finally {
    installMutex.release();
  }
}

export function isInstallLocked(): boolean {
  return installMutex.isLocked();
}
