// Highlight anchoring engine.
//
// THE PROBLEM we are solving (this is what was confusing): a browser Selection /
// Range points at live DOM nodes. The moment React re-renders, streams a tutor
// answer, reveals a `layer` block, or the user reloads, those node references are
// gone — so a naively-stored highlight vanishes or lands on the wrong text.
//
// THE FIX: we don't store DOM positions. We store a "text-quote anchor": the exact
// selected text plus a short prefix and suffix of surrounding characters, AND a
// character offset into the node's plain text as a tiebreaker. To re-apply a
// highlight we search the (possibly changed) text for that quote, using the
// prefix/suffix to disambiguate when the same words appear more than once, and the
// offset to pick the nearest match. This is the same robust approach the W3C Web
// Annotation model uses (TextQuoteSelector + TextPositionSelector).

export interface HighlightAnchor {
  /** The exact selected text. */
  exact: string;
  /** Up to 32 chars immediately before the selection (disambiguates repeats). */
  prefix: string;
  /** Up to 32 chars immediately after the selection. */
  suffix: string;
  /** Character offset of the selection start within the anchor root's text. */
  start: number;
}

const CONTEXT_LEN = 32;

/** Flatten an element's rendered text the same way the browser exposes it. */
function rootText(root: HTMLElement): string {
  return root.textContent ?? '';
}

/**
 * Map a (node, offset) pair to a global character offset within root's textContent
 * by walking text nodes in document order.
 */
function globalOffset(root: HTMLElement, node: Node, offset: number): number | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let count = 0;
  let current = walker.nextNode();
  while (current) {
    if (current === node) return count + offset;
    count += (current.textContent ?? '').length;
    current = walker.nextNode();
  }
  // If the boundary is an element (offset = child index), approximate by summing
  // text up to that point.
  if (node === root) {
    let acc = 0;
    for (let i = 0; i < offset && i < root.childNodes.length; i++) {
      acc += (root.childNodes[i].textContent ?? '').length;
    }
    return acc;
  }
  return null;
}

/** Convert a global character offset back into a concrete (node, offset) pair. */
function locate(root: HTMLElement, target: number): { node: Text; offset: number } | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let count = 0;
  let current = walker.nextNode() as Text | null;
  while (current) {
    const len = current.textContent?.length ?? 0;
    if (target <= count + len) {
      return { node: current, offset: Math.max(0, target - count) };
    }
    count += len;
    current = walker.nextNode() as Text | null;
  }
  return null;
}

/** Build a durable anchor from a live Range, or null if it is empty/invalid. */
export function serializeRange(root: HTMLElement, range: Range): HighlightAnchor | null {
  const exact = range.toString();
  if (!exact.trim()) return null;

  const start = globalOffset(root, range.startContainer, range.startOffset);
  if (start == null) return null;

  const text = rootText(root);
  const end = start + exact.length;
  const prefix = text.slice(Math.max(0, start - CONTEXT_LEN), start);
  const suffix = text.slice(end, end + CONTEXT_LEN);
  return { exact, prefix, suffix, start };
}

/**
 * Find the best matching position for an anchor in the (possibly changed) root.
 * Strategy: collect every occurrence of `exact`; score each by how well the
 * surrounding text matches the stored prefix/suffix and how close it is to the
 * stored start offset; return the global start of the best match.
 */
function bestMatchOffset(text: string, anchor: HighlightAnchor): number | null {
  const positions: number[] = [];
  let idx = text.indexOf(anchor.exact);
  while (idx !== -1) {
    positions.push(idx);
    idx = text.indexOf(anchor.exact, idx + 1);
  }
  if (positions.length === 0) return null;
  if (positions.length === 1) return positions[0];

  let best = positions[0];
  let bestScore = -Infinity;
  for (const pos of positions) {
    const beforeStart = Math.max(0, pos - anchor.prefix.length);
    const before = text.slice(beforeStart, pos);
    const after = text.slice(pos + anchor.exact.length, pos + anchor.exact.length + anchor.suffix.length);
    let score = 0;
    score += commonSuffixLen(before, anchor.prefix); // matching context before
    score += commonPrefixLen(after, anchor.suffix); // matching context after
    score -= Math.abs(pos - anchor.start) / 1000; // tiny nudge toward original spot
    if (score > bestScore) {
      bestScore = score;
      best = pos;
    }
  }
  return best;
}

function commonPrefixLen(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

function commonSuffixLen(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[a.length - 1 - i] === b[b.length - 1 - i]) i++;
  return i;
}

/** Resolve a stored anchor back into a live Range within root, or null if not found. */
export function anchorToRange(root: HTMLElement, anchor: HighlightAnchor): Range | null {
  const text = rootText(root);
  const start = bestMatchOffset(text, anchor);
  if (start == null) return null;
  const startLoc = locate(root, start);
  const endLoc = locate(root, start + anchor.exact.length);
  if (!startLoc || !endLoc) return null;
  const range = document.createRange();
  try {
    range.setStart(startLoc.node, startLoc.offset);
    range.setEnd(endLoc.node, endLoc.offset);
  } catch {
    return null;
  }
  return range;
}

/** Stable id for an anchor (so equal selections de-dupe). */
export function anchorId(nodeId: string, anchor: HighlightAnchor): string {
  return `${nodeId}:${anchor.start}:${anchor.exact.length}`;
}
