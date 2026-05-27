import { useState } from 'react';

interface ColorEntry {
  id: string;
  color: string;
  role: string;
  label: string;
}

const COLOR_ROLES = [
  { value: 'primary', label: 'Primary', desc: 'Main brand color' },
  { value: 'accent', label: 'Accent', desc: 'Highlight / interactive' },
  { value: 'background', label: 'Background', desc: 'Page / card base' },
  { value: 'surface', label: 'Surface', desc: 'Elevated cards / panels' },
  { value: 'text', label: 'Text', desc: 'Body / heading color' },
  { value: 'muted', label: 'Muted', desc: 'Secondary / disabled text' },
  { value: 'success', label: 'Success', desc: 'Positive states' },
  { value: 'warning', label: 'Warning', desc: 'Caution states' },
  { value: 'error', label: 'Error', desc: 'Error / destructive' },
  { value: 'border', label: 'Border', desc: 'Divider / outline' },
  { value: 'custom', label: 'Custom', desc: 'Other' },
];

interface ColorPickerProps {
  colors: ColorEntry[];
  onChange: (colors: ColorEntry[]) => void;
}

export function ColorPicker({ colors, onChange }: ColorPickerProps) {
  const [hexInput, setHexInput] = useState('');
  const [roleInput, setRoleInput] = useState('accent');
  const [labelInput, setLabelInput] = useState('');
  const [hexError, setHexError] = useState('');

  const isValidHex = (v: string) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v);

  const handleAdd = () => {
    const raw = hexInput.trim();
    if (!raw) return;
    const withHash = raw.startsWith('#') ? raw : `#${raw}`;
    if (!isValidHex(withHash)) {
      setHexError('Invalid hex color (e.g. #ec4899)');
      return;
    }
    setHexError('');
    onChange([
      ...colors,
      { id: `${Date.now()}`, color: withHash, role: roleInput, label: labelInput || roleInput },
    ]);
    setHexInput('');
    setLabelInput('');
  };

  const handleRemove = (id: string) => {
    onChange(colors.filter(c => c.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
  };

  return (
    <div className="p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Color Scheme</h3>
        <span className="text-[9px] text-zinc-600">{colors.length} color{colors.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Added colors */}
      {colors.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {colors.map(c => (
            <div key={c.id} className="group relative">
              <div
                className="w-10 h-10 rounded-lg border border-zinc-700/50 cursor-pointer"
                style={{ backgroundColor: c.color }}
                title={`${c.label}: ${c.color}`}
              />
              <div className="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleRemove(c.id)}
                  className="w-4 h-4 rounded-full bg-zinc-800 border border-zinc-600 flex items-center justify-center hover:bg-red-500/80 transition-colors"
                >
                  <svg className="w-2.5 h-2.5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mt-0.5 text-[7px] text-zinc-500 text-center truncate max-w-10">{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Add color form */}
      <div className="flex items-end gap-2">
        <div className="flex-1 min-w-0">
          {hexInput && isValidHex(hexInput.startsWith('#') ? hexInput : `#${hexInput}`) && (
            <div className="mb-1.5 flex items-center gap-1.5">
              <div className="w-5 h-5 rounded border border-zinc-700/50 flex-shrink-0" style={{ backgroundColor: hexInput.startsWith('#') ? hexInput : `#${hexInput}` }} />
              <span className="text-[9px] text-zinc-500 font-mono">{hexInput.startsWith('#') ? hexInput : `#${hexInput}`}</span>
            </div>
          )}
          <input
            type="text"
            value={hexInput}
            onChange={e => { setHexInput(e.target.value); setHexError(''); }}
            onKeyDown={handleKeyDown}
            placeholder="#ec4899"
            className="w-full px-2.5 py-1.5 text-[10px] font-mono bg-zinc-950 border border-zinc-700/50 rounded text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-pink-500/50"
          />
          {hexError && <div className="text-[8px] text-red-400 mt-0.5">{hexError}</div>}
        </div>
        <select
          value={roleInput}
          onChange={e => setRoleInput(e.target.value)}
          className="px-2 py-1.5 text-[9px] bg-zinc-950 border border-zinc-700/50 rounded text-zinc-300 focus:outline-none focus:border-pink-500/50"
        >
          {COLOR_ROLES.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        <input
          type="text"
          value={labelInput}
          onChange={e => setLabelInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="label"
          className="w-16 px-2 py-1.5 text-[9px] bg-zinc-950 border border-zinc-700/50 rounded text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-pink-500/50"
        />
        <button
          onClick={handleAdd}
          disabled={!hexInput.trim()}
          className="px-3 py-1.5 text-[9px] font-medium bg-pink-600 hover:bg-pink-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded transition-colors flex-shrink-0"
        >
          Add
        </button>
      </div>

      {colors.length === 0 && (
        <p className="text-[9px] text-zinc-600 mt-2">No colors added. Type a hex code and click Add.</p>
      )}
    </div>
  );
}

export type { ColorEntry };
export { COLOR_ROLES };
