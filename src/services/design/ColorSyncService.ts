import * as fs from 'fs';
import * as path from 'path';

export interface ColorEntry {
  role: 'bg' | 'text' | 'primary' | 'secondary' | 'accent';
  hex: string;
}

export interface SyncPayload {
  cssVariables: string;
  projectPath: string;
  targetFile: 'globals.css' | 'tailwind.config.js';
}

export interface SyncResult {
  success: boolean;
  message: string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}

export function generateCssVariables(colors: ColorEntry[]): string {
  const lines: string[] = [':root {'];
  for (const c of colors) {
    const rgb = hexToRgb(c.hex);
    if (rgb) {
      lines.push(`  --${c.role}: ${c.hex};`);
      lines.push(`  --${c.role}-rgb: ${rgb.r}, ${rgb.g}, ${rgb.b};`);
    } else {
      lines.push(`  --${c.role}: ${c.hex};`);
    }
  }
  lines.push('}');
  return lines.join('\n');
}

export function generateRealtimeColorsUrl(colors: ColorEntry[]): string {
  const bg = colors.find(c => c.role === 'bg')?.hex.replace('#', '') || '09090b';
  const text = colors.find(c => c.role === 'text')?.hex.replace('#', '') || 'ffffff';
  const primary = colors.find(c => c.role === 'primary')?.hex.replace('#', '') || '06b6d4';
  const secondary = colors.find(c => c.role === 'secondary')?.hex.replace('#', '') || 'a78bfa';
  const accent = colors.find(c => c.role === 'accent')?.hex.replace('#', '') || 'f97316';

  return `https://www.realtimecolors.com?colors=${bg}-${text}-${primary}-${secondary}-${accent}`;
}

export function parseRealtimeColorsUrl(url: string): ColorEntry[] | null {
  try {
    const parsed = new URL(url);
    const hash = parsed.searchParams.get('colors');
    if (!hash) return null;

    const parts = hash.split('-');
    if (parts.length !== 5) return null;

    const roles: ColorEntry['role'][] = ['bg', 'text', 'primary', 'secondary', 'accent'];
    return parts.map((hex, i) => ({
      role: roles[i],
      hex: `#${hex}`,
    }));
  } catch {
    return null;
  }
}

const ROOT_REGEX = /:root\s*\{[^}]*\}/s;
const ROOT_OPEN = ':root {';
const ROOT_CLOSE = '}';

export async function syncTokens(payload: SyncPayload): Promise<SyncResult> {
  const filePath = path.join(payload.projectPath, payload.targetFile);

  try {
    let existingContent = '';
    if (fs.existsSync(filePath)) {
      existingContent = fs.readFileSync(filePath, 'utf-8');
    }

    if (payload.targetFile === 'globals.css') {
      if (ROOT_REGEX.test(existingContent)) {
        const updated = existingContent.replace(ROOT_REGEX, payload.cssVariables);
        fs.writeFileSync(filePath, updated, 'utf-8');
      } else {
        const content = existingContent
          ? `${payload.cssVariables}\n\n${existingContent}`
          : `${payload.cssVariables}\n`;
        fs.writeFileSync(filePath, content, 'utf-8');
      }
      return { success: true, message: `Tokens written to ${payload.targetFile}` };
    }

    if (payload.targetFile === 'tailwind.config.js') {
      const configMatch = existingContent.match(/module\.exports\s*=\s*(\{[\s\S]*\})/);
      if (configMatch) {
        const themeMatch = configMatch[1].match(/theme\s*:\s*\{/);
        if (themeMatch) {
          const cssVars = payload.cssVariables.replace(':root {', '').replace('}', '').trim();
          const cssLines = cssVars.split('\n').filter(l => l.trim());
          const colorEntries: string[] = [];
          for (const line of cssLines) {
            const match = line.match(/--(\w+)\s*:\s*([^;]+)/);
            if (match) {
              colorEntries.push(`        '${match[1]}': '${match[2].trim()}'`);
            }
          }
          const colorsBlock = colorEntries.length > 0
            ? `\n        colors: {\n${colorEntries.join(',\n')}\n        },\n`
            : '';

          const updated = existingContent.replace(
            /(theme\s*:\s*\{)/,
            `$1${colorsBlock}`
          );
          fs.writeFileSync(filePath, updated, 'utf-8');
          return { success: true, message: `Colors added to tailwind.config.js theme` };
        }
      }
      fs.writeFileSync(filePath, existingContent + `\n/* Design tokens */\n${payload.cssVariables}\n`, 'utf-8');
      return { success: true, message: `Tokens appended to ${payload.targetFile}` };
    }

    return { success: false, message: `Unknown target file: ${payload.targetFile}` };
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'EACCES') {
      return { success: false, message: 'Permission denied. Check file permissions.' };
    }
    if (error.code === 'ENOENT') {
      try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, `${payload.cssVariables}\n`, 'utf-8');
        return { success: true, message: `Created ${payload.targetFile} with tokens` };
      } catch (createErr) {
        return { success: false, message: `Failed to create file: ${(createErr as Error).message}` };
      }
    }
    return { success: false, message: `File write error: ${error.message}` };
  }
}
