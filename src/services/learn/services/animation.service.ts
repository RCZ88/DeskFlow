import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

let _manimAvailable: { ok: boolean; python?: string; ffmpeg?: boolean } | null = null;

export function manimAvailable(): Promise<{ ok: boolean; python?: string; ffmpeg?: boolean }> {
  if (_manimAvailable) return Promise.resolve(_manimAvailable);
  return probeManim();
}

async function probeManim(): Promise<{ ok: boolean; python?: string; ffmpeg?: boolean }> {
  let python: string | undefined;
  let ffmpeg = false;

  // Probe python -m manim
  try {
    const { stdout } = await execFileAsync('python', ['-m', 'manim', '--version'], { timeout: 10000 });
    if (stdout && stdout.includes('manim')) {
      python = 'python';
    }
  } catch { /* not available */ }

  // Probe manim directly
  if (!python) {
    try {
      const { stdout } = await execFileAsync('manim', ['--version'], { timeout: 10000 });
      if (stdout && stdout.includes('manim')) {
        python = 'manim';
      }
    } catch { /* not available */ }
  }

  // Probe ffmpeg
  try {
    const { stdout } = await execFileAsync('ffmpeg', ['-version'], { timeout: 5000 });
    ffmpeg = !!(stdout && stdout.includes('ffmpeg'));
  } catch { /* not available */ }

  _manimAvailable = { ok: !!python, python, ffmpeg };
  return _manimAvailable;
}

export async function renderVideoAsset(opts: {
  lessonId: string;
  blockId: string;
  python_source: string;
  scene_name?: string;
  quality?: 'low' | 'medium' | 'high';
}): Promise<{ ok: boolean; video_path?: string; poster_path?: string; status: string; error?: string }> {
  const { lessonId, blockId, python_source, scene_name, quality = 'medium' } = opts;

  const probe = await manimAvailable();
  if (!probe.ok || !probe.python) {
    return { ok: false, status: 'unavailable', error: 'Manim/Python not installed' };
  }

  const animDir = path.join(app.getPath('appData'), 'RHEO', 'lyceum', 'animations', lessonId);
  fs.mkdirSync(animDir, { recursive: true });

  const pyFile = path.join(animDir, `${blockId}.py`);
  fs.writeFileSync(pyFile, python_source, 'utf-8');

  const qualityFlag = quality === 'low' ? '-ql' : quality === 'high' ? '-qh' : '-qm';
  const mediaDir = path.join(animDir, 'media');

  // Resolve scene name from source if not provided
  let resolvedScene = scene_name;
  if (!resolvedScene) {
    const classMatch = python_source.match(/class\s+(\w+)\s*\(\s*Scene\s*\)/);
    if (classMatch) resolvedScene = classMatch[1];
  }
  if (!resolvedScene) {
    return { ok: false, status: 'error', error: 'No Scene class found in Python source' };
  }

  try {
    const { stderr } = await execFileAsync(probe.python, [
      '-m', 'manim', 'render', qualityFlag, '--format', 'mp4',
      '--media_dir', mediaDir,
      pyFile, resolvedScene,
    ], { timeout: 300000 }); // 5 min timeout

    // Find the rendered MP4
    const outputDir = path.join(mediaDir, 'videos', path.basename(pyFile, '.py'), resolvedScene);
    const mp4Name = `${resolvedScene}${qualityFlag}.mp4`;
    const mp4Path = path.join(outputDir, mp4Name);

    if (!fs.existsSync(mp4Path)) {
      // Try finding any mp4 in the output dir
      const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.mp4'));
      if (files.length === 0) {
        return { ok: false, status: 'error', error: `No MP4 found in ${outputDir}. stderr: ${(stderr || '').slice(-500)}` };
      }
      // Use first mp4 found
      const foundMp4 = path.join(outputDir, files[0]);
      const destMp4 = path.join(animDir, `${blockId}.mp4`);
      fs.copyFileSync(foundMp4, destMp4);

      // Generate poster frame if ffmpeg available
      let posterPath: string | undefined;
      if (probe.ffmpeg) {
        posterPath = path.join(animDir, `${blockId}.png`);
        try {
          await execFileAsync('ffmpeg', [
            '-i', destMp4, '-vf', 'select=eq(n\\,0)', '-vframes', '1', '-y', posterPath,
          ], { timeout: 10000 });
        } catch { posterPath = undefined; }
      }

      return { ok: true, video_path: destMp4, poster_path: posterPath, status: 'done' };
    }

    // Copy MP4 to animations dir
    const destMp4 = path.join(animDir, `${blockId}.mp4`);
    fs.copyFileSync(mp4Path, destMp4);

    // Generate poster frame if ffmpeg available
    let posterPath: string | undefined;
    if (probe.ffmpeg) {
      posterPath = path.join(animDir, `${blockId}.png`);
      try {
        await execFileAsync('ffmpeg', [
          '-i', destMp4, '-vf', 'select=eq(n\\,0)', '-vframes', '1', '-y', posterPath,
        ], { timeout: 10000 });
      } catch { posterPath = undefined; }
    }

    return { ok: true, video_path: destMp4, poster_path: posterPath, status: 'done' };
  } catch (e: any) {
    return {
      ok: false,
      status: 'error',
      error: e.message?.slice(-1000) || 'Manim render failed',
    };
  }
}

export function getAnimationPreview(opts: {
  lessonId: string;
  blockId: string;
}): { ok: boolean; poster_path?: string | null } {
  const animDir = path.join(app.getPath('appData'), 'RHEO', 'lyceum', 'animations', opts.lessonId);
  const posterPath = path.join(animDir, `${opts.blockId}.png`);
  if (fs.existsSync(posterPath)) {
    return { ok: true, poster_path: posterPath };
  }
  return { ok: true, poster_path: null };
}
