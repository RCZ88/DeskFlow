interface PersonChipProps {
  name: string;
  onRemove?: () => void;
}

export function PersonChip({ name, onRemove }: PersonChipProps) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#6fb38f]/15 text-[#6fb38f] text-[10px] font-medium">
      {name}
      {onRemove && (
        <button onClick={onRemove} className="hover:text-[#f0a892] transition-colors">&times;</button>
      )}
    </span>
  );
}
