import { useMemo, useState } from 'react';
import { Images, Heart } from 'lucide-react';
import { PageShell } from '../../components/PageShell';
import { TabBar } from '../../components/TabBar';
import { EmptyState } from '../../components/EmptyState';
import { useMemories, type LoadedMemory } from './useMemories';
import { MemoryUploader } from './MemoryUploader';
import { MemoryCollageGrid } from './MemoryCollageGrid';
import { MemoryTimeline } from './MemoryTimeline';
import { MemoryReveal } from './MemoryReveal';
import { MemoryReel } from './MemoryReel';
import { RecapPlayer } from './RecapPlayer';
import { OnThisDayCard } from './OnThisDayCard';

interface MemoriesPageProps {
  embedded?: boolean;
}

export default function MemoriesPage({ embedded = false }: MemoriesPageProps = {}) {
  const { items, upload, remove, updateMeta, onThisDay, groupedByMonth } = useMemories();
  const [tab, setTab] = useState<'collage' | 'timeline'>('collage');
  const [active, setActive] = useState<LoadedMemory | null>(null);
  const [recapOpen, setRecapOpen] = useState(false);

  const reelItems = useMemo(() => {
    const seen = new Set<string>();
    const ordered = [...onThisDay, ...items];
    return ordered.filter(m => (seen.has(m.meta.id) ? false : (seen.add(m.meta.id), true))).slice(0, 24);
  }, [items, onThisDay]);

  const recapItems = useMemo(() => [...items].reverse(), [items]);

  const body = (
    <div
      className={embedded ? 'space-y-4' : 'max-w-4xl mx-auto space-y-4'}
      onPaste={e => {
        const files = Array.from(e.clipboardData?.files || []);
        if (files.length) upload(files);
      }}
    >
      <div className="flex items-center justify-between">
        {embedded ? (
          <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
            <Heart className="w-3 h-3 text-[#e8866b]" /> The people and moments outside the work
          </p>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#6fb38f]/15 flex items-center justify-center text-[#6fb38f]">
              <Images className="w-4.5 h-4.5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[var(--text-primary)]">Memories</h1>
              <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                <Heart className="w-3 h-3 text-[#e8866b]" /> The people and moments outside the work
              </p>
            </div>
          </div>
        )}
        <TabBar
          tabs={[{ key: 'collage', label: 'Collage' }, { key: 'timeline', label: 'Timeline' }]}
          activeKey={tab}
          onTabChange={k => setTab(k as 'collage' | 'timeline')}
        />
      </div>

      <MemoryReel items={reelItems} onOpen={setActive} onPlayRecap={() => setRecapOpen(true)} />

      <OnThisDayCard items={onThisDay} onOpen={setActive} />

      <MemoryUploader onFiles={upload} />

      {items.length === 0 ? (
        <EmptyState
          title="No memories yet"
          description="Add a photo or video of someone or something you love. This space stays yours -- nothing leaves this device."
        />
      ) : tab === 'collage' ? (
        <MemoryCollageGrid items={items} onOpen={setActive} />
      ) : (
        <MemoryTimeline groups={groupedByMonth} onOpen={setActive} />
      )}
    </div>
  );

  const overlays = (
    <>
      {active && (
        <MemoryReveal
          memory={active}
          onClose={() => setActive(null)}
          onDelete={() => { remove(active.meta.id); setActive(null); }}
          onUpdatePeople={people => { updateMeta(active.meta.id, { people }); setActive({ ...active, meta: { ...active.meta, people } }); }}
          onUpdateCaption={caption => updateMeta(active.meta.id, { caption })}
        />
      )}
      {recapOpen && <RecapPlayer items={recapItems} onClose={() => setRecapOpen(false)} />}
    </>
  );

  if (embedded) {
    return (
      <>
        {body}
        {overlays}
      </>
    );
  }

  return (
    <PageShell page="memories">
      {body}
      {overlays}
    </PageShell>
  );
}
