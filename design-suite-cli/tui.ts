const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  bgCyan: '\x1b[46m',
  bgBlack: '\x1b[40m',
};

const WIDTH = 58;

export function box(lines: string[]): string {
  const top = `${C.cyan}┌${'─'.repeat(WIDTH - 2)}┐${C.reset}`;
  const bottom = `${C.cyan}└${'─'.repeat(WIDTH - 2)}┘${C.reset}`;
  const body = lines.map(line => {
    const stripped = line.replace(/\x1b\[[0-9;]*m/g, '');
    const padding = Math.max(0, WIDTH - 4 - stripped.length);
    return `${C.cyan}│${C.reset}  ${line}${' '.repeat(padding)}${C.cyan}│${C.reset}`;
  }).join('\n');
  return `${top}\n${body}\n${bottom}`;
}

export function heading(text: string): string {
  return `${C.bold}${C.cyan}${text}${C.reset}`;
}

export function success(text: string): string {
  return `${C.green}✓ ${text}${C.reset}`;
}

export function error(text: string): string {
  return `${C.red}✗ ${text}${C.reset}`;
}

export function info(text: string): string {
  return `${C.yellow}→ ${text}${C.reset}`;
}

export function label(text: string): string {
  return `${C.bold}${C.white}${text}${C.reset}`;
}

export function dim(text: string): string {
  return `${C.dim}${text}${C.reset}`;
}

export function divider(): string {
  return `${C.gray}${'─'.repeat(WIDTH - 4)}${C.reset}`;
}

export function colorSwatch(hex: string, label?: string): string {
  return `${hex} ${label ? dim(label) : ''}`;
}
