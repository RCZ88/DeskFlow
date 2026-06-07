export interface ParsedChecklistItem {
  raw: string;
  title: string;
  checked: boolean;
  targetSeconds?: number;
  lineIndex: number;
}

const TIME_RE = /\((\d+(?:\.\d+)?)\s*(h|hr|hrs|m|min)\)/i;

export function parseChecklist(md: string): ParsedChecklistItem[] {
  const lines = md.split('\n');
  const items: ParsedChecklistItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const checked = trimmed.startsWith('- [x] ') || trimmed.startsWith('- [X] ');
    const unchecked = trimmed.startsWith('- [ ] ');
    if (!checked && !unchecked) continue;

    const raw = trimmed;
    const title = (checked || unchecked)
      ? trimmed.replace(/^- \[[xX ]\]\s*/, '')
      : trimmed;

    const timeMatch = title.match(TIME_RE);
    let targetSeconds: number | undefined;
    if (timeMatch) {
      const val = parseFloat(timeMatch[1]);
      const unit = timeMatch[2].toLowerCase();
      targetSeconds = unit.startsWith('h') ? val * 3600 : val * 60;
    }

    items.push({ raw, title: title.replace(TIME_RE, '').trim(), checked, targetSeconds, lineIndex: i });
  }

  return items;
}
