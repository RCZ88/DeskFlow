import { spawn } from 'child_process';

interface InstallResult {
  success: boolean;
  stdout: string;
  stderr: string;
  installedPaths: string[];
}

export async function installShadcnComponent(
  registryUrl: string,
  projectPath: string
): Promise<string> {
  return new Promise((resolve) => {
    const proc = spawn('npx', ['shadcn@latest', 'add', registryUrl, '--yes'], {
      cwd: projectPath,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data: Buffer) => { stdout += data.toString(); });
    proc.stderr?.on('data', (data: Buffer) => { stderr += data.toString(); });

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      resolve(JSON.stringify({ success: false, stdout, stderr: stderr + '\nTimed out', installedPaths: [] }));
    }, 120000);

    proc.on('close', (code) => {
      clearTimeout(timer);
      const paths = stdout.split('\n')
        .filter(l => l.match(/\.(tsx?|jsx?|css|json)$/))
        .map(l => l.trim());
      resolve(JSON.stringify({
        success: code === 0,
        stdout,
        stderr,
        installedPaths: [...new Set(paths)],
      }));
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      resolve(JSON.stringify({ success: false, stdout, stderr: err.message, installedPaths: [] }));
    });
  });
}
