/**
 * Stable, fast content fingerprinting.
 *
 * Returns a short hex string that changes when the input's relevant
 * fields change.  Two calls with structurally-identical inputs always
 * produce the same result (no Date/random dependency).
 *
 * Use: pass through React useEffect / useMemo deps, or attach to IPC
 * responses so the renderer can skip redundant work.
 */

const HEX = '0123456789abcdef';

function hashString(s: string): string {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return HEX[(h >> 28) & 0xf] + HEX[(h >> 24) & 0xf] +
         HEX[(h >> 20) & 0xf] + HEX[(h >> 16) & 0xf] +
         HEX[(h >> 12) & 0xf] + HEX[(h >> 8) & 0xf] +
         HEX[(h >> 4) & 0xf] + HEX[(h) & 0xf];
}

function hashNumber(n: number): string {
  const s = String(n);
  return hashString(s);
}

/** Fingerprint an array of objects by key fields. */
export function fingerprintRows<T extends Record<string, any>>(
  rows: T[],
  keys: (keyof T)[],
): string {
  let acc = '';
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let k = 0; k < keys.length; k++) {
      const val = row[keys[k]];
      acc += `${keys[k]}:`;
      if (val === null || val === undefined) acc += 'n';
      else if (typeof val === 'number') acc += hashNumber(val);
      else acc += hashString(String(val));
      acc += '|';
    }
  }
  return hashString(acc);
}

/** Fingerprint a flat record (e.g. an IPC response envelope). */
export function fingerprintRecord(obj: Record<string, any>): string {
  const keys = Object.keys(obj).sort();
  let acc = '';
  for (const k of keys) {
    const val = obj[k];
    acc += `${k}:`;
    if (val === null || val === undefined) acc += 'n';
    else if (Array.isArray(val)) acc += fingerprintRows(val, Object.keys(val[0] || {}) as any);
    else if (typeof val === 'number') acc += hashNumber(val);
    else acc += hashString(String(val));
    acc += '|';
  }
  return hashString(acc);
}
