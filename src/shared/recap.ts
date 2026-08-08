export type RecapStage = 'reading' | 'analyzing' | 'writing' | 'saving' | 'done';

const BRIEF_PATTERNS: RegExp[] = [
  /^financial biographer/i,
  /^write\s+(it\s+)?in second person/i,
  /^avoid:/i,
  /^no clich/i,
  /^no self-help/i,
  /^no exclamation/i,
  /^no judgmental/i,
  /^no vague/i,
  /^use exact (numbers|figures)/i,
  /^never invent/i,
  /^end with one short/i,
  /^you have access/i,
  /^access to data/i,
  /^from the structured stats/i,
  /^choose what to highlight/i,
  /^if income was zero/i,
  /^if one category/i,
  /^this is (a|an) (narrative|financial|monthly)/i,
  /^please read the data below/i,
  /^craft a recap/i,
  /^(here'?s|here is|okay|ok,?|sure,?|absolutely|let me|could|certainly|i'?ll|i will|consider|l want)/i,
  /^(draft|recap|preview|title|plan|thought|preamble|reasoning|analysis|summary)\s*:/i,
];

const DATA_PATTERNS: RegExp[] = [
  /^month\s*:\s*\d{4}-\d{2}/i,
  /^month\s*:\s*[a-zA-Z]+\s+\d{4}/i,
  /^income\s*:/i,
  /^expenses?\s*:/i,
  /^net flow\s*:/i,
  /^in (the )?\d{4}-\d{2} \(displayed in /i,
  /^top spending categor/i,
  /^wallet balance/i,
  /^subscriptions billed/i,
  /^fixed expenses?\s*:/i,
  /^follow-?through people/i,
  /^biggest single expense/i,
  /^biggest income event/i,
  /^across \d+ (transaction|active day)/i,
  /^previous month\s*:/i,
  /^\(none\)$/i,
  /^[\w&'()\- ]+: [\d.,]+ \(\d+ txns?/i,
  /^[\w&'()\- ]+: [\d.,]+ → [\d.,]+ \([+-]?[\d.,]+\)$/,
  /^[a-z0-9&'\- ]+: net [+-][\d.,]+ \(\d+ txns?/i,
  /^[a-z0-9&'\- ]+, [\d.,]+ on \d{4}-\d{2}-\d{2}( \([a-z ]+\))?$/i,
];

const isBriefLine = (line: string): boolean => BRIEF_PATTERNS.some((r) => r.test(line));
const isDataLine = (line: string): boolean => DATA_PATTERNS.some((r) => r.test(line));

function unwrapBulletLine(line: string): string {
  let s = line.replace(/^\s*[*•·\-]\s*/, '').trim();
  const label = s.match(/^\*{1,2}([^*]+?)\*{1,2}\s*:\s*/);
  if (label) {
    const inner = label[1].trim();
    const rest = s.slice(label[0].length).trim();
    if (/^[A-Z][A-Za-z &/'\-]{1,40}$/.test(inner) && rest.length > 0) {
      s = rest.charAt(0).toUpperCase() + rest.slice(1);
    }
  }
  return s.replace(/\*\*/g, '').replace(/\*([^*]+)\*/g, '$1');
}

/**
 * Heuristic cleanup of a raw AI recap narrative.
 * Strips the echoed brief (system rules), the echoed data bullet list
 * ("Month:", "Income:", …), and thought/plan preambles, then unwraps
 * bullet-narrative lines into plain prose paragraphs. Never invents content.
 */
export function cleanRecapSummary(raw: string | null | undefined): string {
  if (!raw) return '';
  const text = String(raw).replace(/\r\n/g, '\n').trim();
  if (!text) return '';

  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const kept: string[] = [];

  for (const para of paragraphs) {
    const lines = para.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    const keptLines: string[] = [];
    for (const line of lines) {
      const t = line.replace(/^\s*[*•·\-]\s*/, '').replace(/^\*{1,2}/, '').trim();
      if (!t || isBriefLine(t) || isDataLine(t)) continue;
      keptLines.push(unwrapBulletLine(line));
    }
    if (!keptLines.length) continue;
    kept.push(keptLines.join(' ').trim());
  }

  let story = kept.join('\n\n').replace(/^(here(?:'s| is) (?:your|the )?|ok,?\s*|sure,?\s*|let me|i'll|i will|written\s*:?|##+\s*)/i, '').trim();
  return story;
}

export interface RecapApex {
  title: string;
  text: string;
}

const fmt = (n: number): string => Math.round(n).toLocaleString('en-US');

/**
 * Computes a real, numbers-only insight for the recap's APEX slot.
 * Falls back through: dominant category → net swing vs prev month →
 * wallet movement → largest transaction. Never invents numbers.
 */
export function computeApexInsight(stats: any): RecapApex | null {
  if (!stats) return null;

  const top = stats.topCategories?.[0];
  if (top && stats.expense?.total > 0) {
    const share = Math.round((top.amount / stats.expense.total) * 100);
    if (share >= 30) {
      return {
        title: `${top.name} dominated ${share}% of spending`,
        text: `${fmt(top.amount)} went to ${top.name} across ${top.count} purchase(s) — the single biggest pull on ${fmt(stats.expense.total)} of total spending this month.`,
      };
    }
    return {
      title: `Biggest category: ${top.name}`,
      text: `${fmt(top.amount)} across ${top.count} purchase(s), about ${share}% of the month's ${fmt(stats.expense.total)} spending.`,
    };
  }

  const mom = stats.momDelta;
  const prev = stats.previousMonth;
  if (prev && typeof prev.net === 'number') {
    if (stats.net >= 0 && prev.net < 0) {
      return {
        title: `Back in the black`,
        text: `Net flow flipped from ${fmt(prev.net)} last month to ${fmt(stats.net)} this month — a swing of ${fmt(stats.net - prev.net)}.`,
      };
    }
    if (mom?.expense !== 0) {
      const dir = mom.expense > 0 ? 'up' : 'down';
      return {
        title: `Spending ${dir} ${Math.abs(mom.expense)}% vs last month`,
        text: `Expenses moved ${dir} to ${fmt(stats.expense?.total ?? 0)} this month (last month: ${fmt(prev.expense ?? 0)}).`,
      };
    }
  }

  const wallet = stats.walletBalanceDelta?.find((w: any) => Math.abs(w.delta || 0) >= 5000);
  if (wallet) {
    return {
      title: `${wallet.name} moved ${fmt(Math.abs(wallet.delta))}`,
      text: `Your ${wallet.name} balance ${wallet.delta >= 0 ? 'grew' : 'shrank'} by ${fmt(Math.abs(wallet.delta))} over the month (${fmt(wallet.startBalance)} → ${fmt(wallet.endBalance)}).`,
    };
  }

  const big = stats.biggestExpense;
  if (big) {
    return {
      title: `Largest single purchase: ${fmt(big.amount)}`,
      text: `${big.description ?? 'One purchase'} was your biggest outlay at ${fmt(big.amount)} on ${big.date ?? 'the month'}.`,
    };
  }

  return null;
}