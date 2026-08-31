import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Merchant {
  id: number;
  name: string;
  account_id?: number | null;
}

interface MerchantComboboxProps {
  merchants: Merchant[];
  value: number | null;
  onChange: (merchantId: number | null, merchantName: string) => void;
  onAddMerchant: (name: string) => Promise<number | null>;
  disabled?: boolean;
  placeholder?: string;
}

export function MerchantCombobox({
  merchants,
  value,
  onChange,
  onAddMerchant,
  disabled = false,
  placeholder = 'Select or type a merchant...',
}: MerchantComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

  const selected = merchants.find(p => p.id === value);
  const filtered = query
    ? merchants.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
    : merchants;

  const showCreate = query.trim() && !merchants.some(p => p.name.toLowerCase() === query.trim().toLowerCase());

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, [open]);

  const handleSelect = (merchant: Merchant) => {
    onChange(merchant.id, merchant.name);
    setQuery('');
    setOpen(false);
  };

  const handleCreate = async () => {
    const name = query.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const newId = await onAddMerchant(name);
      if (newId && newId > 0) {
        onChange(newId, name);
      } else {
        onChange(null, name);
      }
    } catch {
      onChange(null, name);
    }
    setCreating(false);
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          value={open ? query : (selected?.name ?? '')}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); setQuery(''); }}
          onKeyDown={e => {
            if (e.key === 'Escape') setOpen(false);
            if (e.key === 'Enter' && showCreate) { e.preventDefault(); handleCreate(); }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full rounded-lg border border-amber-500/30 bg-amber-500/5 px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 outline-none focus:border-amber-500/50 disabled:opacity-40"
        />
        {value !== null && value > 0 && (
          <button
            onClick={() => { onChange(null, ''); setQuery(''); }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs px-1"
          >
            ×
          </button>
        )}
      </div>

      {open && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] max-h-40 overflow-y-auto rounded-lg border border-amber-500/30 bg-zinc-800 shadow-xl"
          style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
        >
          {filtered.length === 0 && !showCreate && (
            <div className="px-2.5 py-2 text-[11px] text-zinc-500">No merchants found</div>
          )}
          {filtered.map(p => (
            <button
              key={p.id}
              onClick={() => handleSelect(p)}
              className={`w-full text-left px-2.5 py-2 text-xs transition-colors hover:bg-amber-500/10 ${
                p.id === value ? 'text-amber-400 bg-amber-500/10' : 'text-zinc-200'
              }`}
            >
              <span>{p.name}</span>
            </button>
          ))}
          {showCreate && (
            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-full text-left px-2.5 py-2 text-xs text-emerald-400 hover:bg-emerald-500/10 transition-colors border-t border-amber-500/10 disabled:opacity-40"
            >
              {creating ? 'Creating...' : <>+ Create &ldquo;{query.trim()}&rdquo;</>}
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
