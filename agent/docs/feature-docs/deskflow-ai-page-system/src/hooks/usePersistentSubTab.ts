import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export function usePersistentSubTab(key: string, fallback: string) {
  const [sp, setSp] = useSearchParams();
  const initial = sp.get(key) ?? localStorage.getItem(`subtab:${key}`) ?? fallback;
  const [active, setActive] = useState(initial);
  const set = (v: string) => {
    setActive(v);
    localStorage.setItem(`subtab:${key}`, v);
    setSp((p) => { p.set(key, v); return p; }, { replace: true });
  };
  return [active, set] as const;
}
