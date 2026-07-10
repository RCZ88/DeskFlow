import { useState, useRef, useEffect } from 'react';

interface Person {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
}

interface FTPersonComboboxProps {
  persons: Person[];
  value: number | null;
  onChange: (personId: number | null, personName: string) => void;
  onAddPerson: (name: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function FTPersonCombobox({
  persons,
  value,
  onChange,
  onAddPerson,
  disabled = false,
  placeholder = 'Select or type a person...',
}: FTPersonComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = persons.find(p => p.id === value);
  const filtered = query
    ? persons.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
    : persons;

  const showCreate = query.trim() && !persons.some(p => p.name.toLowerCase() === query.trim().toLowerCase());

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (person: Person) => {
    onChange(person.id, person.name);
    setQuery('');
    setOpen(false);
  };

  const handleCreate = () => {
    const name = query.trim();
    if (!name) return;
    onAddPerson(name);
    onChange(-1, name);
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

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-40 overflow-y-auto rounded-lg border border-amber-500/30 bg-zinc-800 shadow-xl">
          {filtered.length === 0 && !showCreate && (
            <div className="px-2.5 py-2 text-[11px] text-zinc-500">No persons found</div>
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
              {p.email && <span className="text-[10px] text-zinc-500 ml-2">{p.email}</span>}
            </button>
          ))}
          {showCreate && (
            <button
              onClick={handleCreate}
              className="w-full text-left px-2.5 py-2 text-xs text-emerald-400 hover:bg-emerald-500/10 transition-colors border-t border-amber-500/10"
            >
              + Create &ldquo;{query.trim()}&rdquo;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
