import { useEffect, useState } from 'react';
import { Select, SelectItem } from '../ui/select';

export interface FocusGroupOption {
  id: number;
  name: string;
}

export function focusGroupValue(id: number | string): string {
  return `fg:${id}`;
}

export function isFocusGroupMatch(value: string): boolean {
  return typeof value === 'string' && value.toLowerCase().startsWith('fg:');
}

export function parseFocusGroupId(value: string): number | null {
  const n = parseInt(String(value || '').slice(3), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function useFocusGroups(): { groups: FocusGroupOption[]; loading: boolean; error: boolean } {
  const [state, setState] = useState<{ groups: FocusGroupOption[]; loading: boolean; error: boolean }>({
    groups: [],
    loading: true,
    error: false,
  });
  useEffect(() => {
    let mounted = true;
    const api = (window as any).deskflowAPI;
    if (!api?.focusGroup?.list) {
      setState(s => ({ ...s, loading: false }));
      return;
    }
    api.focusGroup.list()
      .then((rows: any[]) => {
        if (mounted) setState({ groups: Array.isArray(rows) ? rows : [], loading: false, error: false });
      })
      .catch(() => {
        if (mounted) setState(s => ({ ...s, loading: false, error: true }));
      });
    return () => { mounted = false; };
  }, []);
  return state;
}

export function focusGroupName(groups: FocusGroupOption[], value: string): string | null {
  const id = parseFocusGroupId(value);
  if (!id) return null;
  const g = groups.find(x => x.id === id);
  return g ? g.name : null;
}

export function describeMatchCategory(groups: FocusGroupOption[], value?: string | null): string {
  if (!value) return '';
  if (isFocusGroupMatch(value)) {
    const name = focusGroupName(groups, value);
    return name ? `Focus group: ${name}` : `Focus group #${parseFocusGroupId(value)}`;
  }
  return `Category: ${value}`;
}

export function FocusGroupSelect({
  value,
  onValueChange,
  className,
  label,
  allowAny = true,
}: {
  value: string;
  onValueChange: (v: string) => void;
  className?: string;
  label?: string;
  allowAny?: boolean;
}) {
  const { groups, loading, error } = useFocusGroups();
  const legacyValue = value && !isFocusGroupMatch(value) ? value : null;

  return (
    <div>
      {label && <label className="text-[11px] text-zinc-500 mb-1 block">{label}</label>}
      <Select value={value} onValueChange={onValueChange} className={className} disabled={loading}>
        {loading && <SelectItem value="" disabled>Loading focus groups…</SelectItem>}
        {!loading && allowAny && <SelectItem value="">Any app (total tracked time)</SelectItem>}
        {!loading && groups.map(g => (
          <SelectItem key={g.id} value={focusGroupValue(g.id)}>{g.name}</SelectItem>
        ))}
        {!loading && groups.length === 0 && !legacyValue && (
          <SelectItem value="" disabled>No focus groups yet</SelectItem>
        )}
        {!loading && legacyValue !== null && (
          <SelectItem value={legacyValue}>Category: {legacyValue} (legacy)</SelectItem>
        )}
      </Select>
      {!loading && groups.length === 0 && !legacyValue && (
        <p className="text-[10px] text-zinc-600 mt-1">
          No focus groups yet — create one in the Focus workspace first. Progress counts completed focus sessions of the group.
        </p>
      )}
      {error && (
        <p className="text-[10px] text-amber-500 mt-1">Could not load focus groups.</p>
      )}
    </div>
  );
}
