import type { ElementInfo } from './types';

function getXPath(element: Element): string {
  if (element === document.body) return '/html/body';
  if (element.id) return `//*[@id="${element.id}"]`;
  const parent = element.parentElement;
  if (!parent) return '';
  const siblings = Array.from(parent.children).filter(c => c.tagName === element.tagName);
  const index = siblings.indexOf(element);
  const tag = element.tagName.toLowerCase();
  const step = index >= 0 && siblings.length > 1 ? `[${index + 1}]` : '';
  return `${getXPath(parent)}/${tag}${step}`;
}

function getCssSelector(element: Element): string {
  if (element.id) return `#${element.id}`;
  const parts: string[] = [];
  let current: Element | null = element;
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    if (current.id) {
      selector = `#${current.id}`;
      parts.unshift(selector);
      break;
    }
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).slice(0, 2).map(c => `.${c}`).join('');
      selector += classes;
    }
    parts.unshift(selector);
    current = current.parentElement;
  }
  return parts.join(' > ');
}

function getComponentStack(element: Element): string | undefined {
  const fiber = Object.keys(element).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
  if (!fiber) return undefined;
  const fiberNode = (element as any)[fiber];
  const stack: string[] = [];
  let current = fiberNode;
  for (let i = 0; i < 10 && current; i++) {
    if (current.type && typeof current.type === 'function') {
      const name = current.type.displayName || current.type.name;
      if (name && name !== 'ForwardRef' && name !== 'Memo') {
        stack.push(name);
      }
    }
    current = current.return;
  }
  return stack.length > 0 ? stack.join(' → ') : undefined;
}

function getSignificantAttributes(element: Element): Record<string, string> {
  const attrs: Record<string, string> = {};
  const significant = ['role', 'aria-label', 'data-testid', 'href', 'type', 'name', 'placeholder'];
  for (const attr of significant) {
    const val = element.getAttribute(attr);
    if (val) attrs[attr] = val;
  }
  return attrs;
}

function getCleanText(element: Element, maxLength: number = 200): string {
  const text = element.textContent || '';
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength) + '…' : cleaned;
}

export function detectElement(x: number, y: number): ElementInfo | null {
  const element = document.elementFromPoint(x, y);
  if (!element || element === document.documentElement || element === document.body) return null;
  if (element.closest('[data-selection-overlay]')) return null;
  const rect = element.getBoundingClientRect();
  return {
    tagName: element.tagName.toLowerCase(),
    className: element.className && typeof element.className === 'string' ? element.className : '',
    id: element.id || '',
    xpath: getXPath(element),
    cssSelector: getCssSelector(element),
    rect,
    textContent: getCleanText(element),
    attributes: getSignificantAttributes(element),
    componentStack: getComponentStack(element),
  };
}

export function getHoverableElementsInRect(
  x: number,
  y: number,
  width: number,
  height: number
): ElementInfo[] {
  const elements: ElementInfo[] = [];
  const step = Math.max(10, Math.min(width, height) / 4);
  const visited = new Set<Element>();
  for (let px = x; px <= x + width; px += step) {
    for (let py = y; py <= y + height; py += step) {
      const el = document.elementFromPoint(px, py);
      if (el && !visited.has(el) && !el.closest('[data-selection-overlay]')) {
        visited.add(el);
        const info = detectElement(px, py);
        if (info) elements.push(info);
      }
    }
  }
  return elements;
}
