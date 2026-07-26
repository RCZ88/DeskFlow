import { useRef, useMemo } from 'react';

function shallowEqual(a: any[], b: any[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object' || a === null) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}

export function useStableMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  compare: (a: T, b: T) => boolean = deepEqual
): T {
  const ref = useRef<{ value: T; deps: any[] } | null>(null);
  const depsChanged = !ref.current || !shallowEqual(ref.current.deps, deps);

  if (depsChanged) {
    const newValue = factory();
    if (!ref.current || !compare(ref.current.value, newValue)) {
      ref.current = { value: newValue, deps };
    } else {
      ref.current.deps = deps;
    }
  }

  return ref.current!.value;
}
