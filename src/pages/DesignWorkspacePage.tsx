import { useState, useCallback, useEffect } from 'react';
import { Palette } from 'lucide-react';
import { TasteKnobs, type TasteKnobValues } from '../components/workspace/TasteKnobs';
import { StyleReferences } from '../components/workspace/StyleReferences';
import { DesignComposeOutlet } from '../components/workspace/DesignComposeOutlet';
import { StyleDescription } from '../components/workspace/StyleDescription';
import { ColorPicker, type ColorEntry } from '../components/workspace/ColorPicker';

interface DesignWorkspacePageProps {
  projectPath?: string;
  activeTerminalId?: string | null;
}

const DEFAULT_TASTE: TasteKnobValues = {
  designVariance: 5,
  motionIntensity: 5,
  visualDensity: 5,
};

const SKILL_DIRS = ['frontend-design', 'impeccable', 'ui-ux-pro-max', 'taste-skill', 'design-taste'];
const REF_NAMES = ['Claude', 'Linear', 'Vercel', 'Stripe', 'Supabase', 'Sentry', 'PostHog', 'Raycast'];

async function readFileContent(relativePath: string, projectPath?: string): Promise<string | null> {
  try {
    const dapi = (window as any).deskflowAPI;
    const result = await dapi?.readProjectFile?.(relativePath, projectPath);
    if (result?.success && result.data) return result.data;
    return null;
  } catch {
    return null;
  }
}

function buildColorSchemeXml(colors: ColorEntry[]): string {
  if (colors.length === 0) return '';
  const lines: string[] = ['  <color_palette>'];
  for (const c of colors) {
    lines.push(`    <color role="${c.role}" hex="${c.color}" label="${c.label}" />`);
  }
  lines.push('  </color_palette>');
  return lines.join('\n');
}

async function buildFullContext(
  taste: TasteKnobValues,
  selectedRefs: string[],
  projectPath?: string,
  styleDescription?: string,
  colors?: ColorEntry[],
): Promise<string> {
  const parts: string[] = [];
  parts.push(`<design_taste>`);
  parts.push(`  design_variance="${taste.designVariance}"`);
  parts.push(`  motion_intensity="${taste.motionIntensity}"`);
  parts.push(`  visual_density="${taste.visualDensity}"`);
  parts.push(`</design_taste>`);
  parts.push('');

  if (styleDescription) {
    parts.push(`<style_notes>${styleDescription}</style_notes>`);
    parts.push('');
  }

  if (colors && colors.length > 0) {
    parts.push(buildColorSchemeXml(colors));
    parts.push('');
  }

  parts.push('<design_skills>');
  for (const dir of SKILL_DIRS) {
    const content = await readFileContent(`agent/skills/${dir}/SKILL.md`, projectPath);
    if (content) {
      const stripped = content.replace(/---[\s\S]*?---/, '').trim();
      parts.push(stripped.slice(0, 1500));
      parts.push('');
    }
  }
  parts.push('</design_skills>');
  parts.push('');

  const selectedNames = REF_NAMES.filter(r => selectedRefs.includes(r));
  if (selectedNames.length > 0) {
    parts.push('<design_references>');
    for (const name of selectedNames) {
      const content = await readFileContent(`agent/design-references/${name.toLowerCase()}/DESIGN.md`, projectPath);
      if (content) {
        const stripped = content.replace(/---[\s\S]*?---/, '').trim();
        parts.push(`<reference name="${name}">`);
        parts.push(stripped.slice(0, 2000));
        parts.push('</reference>');
        parts.push('');
      }
    }
    parts.push('</design_references>');
  }

  parts.push('[END DESIGN CONTEXT]');
  return parts.join('\n');
}

export default function DesignWorkspacePage({ projectPath, activeTerminalId }: DesignWorkspacePageProps) {
  const [taste, setTaste] = useState<TasteKnobValues>(DEFAULT_TASTE);
  const [selectedRefs, setSelectedRefs] = useState<string[]>([]);
  const [styleDescription, setStyleDescription] = useState('');
  const [colors, setColors] = useState<ColorEntry[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [lastSent, setLastSent] = useState<string | null>(null);
  const [preview, setPreview] = useState<string>('Loading design context...');
  const [loadingContext, setLoadingContext] = useState(true);

  const refreshPreview = useCallback(async () => {
    setLoadingContext(true);
    const ctx = await buildFullContext(taste, selectedRefs, projectPath, styleDescription, colors);
    setPreview(ctx);
    setLoadingContext(false);
  }, [taste, selectedRefs, styleDescription, colors, projectPath]);

  const handleSend = async () => {
    if (!activeTerminalId) return;
    setIsSending(true);
    try {
      const ctx = await buildFullContext(taste, selectedRefs, projectPath, styleDescription, colors);
      const dapi = (window as any).deskflowAPI;
      await dapi?.terminalWrite?.(activeTerminalId, ctx + '\n');
      await dapi?.saveTerminalBinding?.({
        terminalId: activeTerminalId,
        problemId: null,
        sessionContext: JSON.stringify({
          design_variance: taste.designVariance,
          motion_intensity: taste.motionIntensity,
          visual_density: taste.visualDensity,
          style_references: selectedRefs,
          style_description: styleDescription,
          color_scheme: colors,
        }),
        status: 'active',
      });
      setLastSent(new Date().toLocaleTimeString());
    } catch (e) {
      console.error('[DesignWorkspace] send failed', e);
    }
    setIsSending(false);
  };

  const handleCopy = async () => {
    const ctx = await buildFullContext(taste, selectedRefs, projectPath, styleDescription, colors);
    navigator.clipboard?.writeText(ctx);
  };

  useEffect(() => { refreshPreview(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 flex items-center justify-center">
          <Palette className="w-4.5 h-4.5 text-pink-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">Design Workspace</h2>
          <p className="text-[10px] text-zinc-500">Compose design taste + skills + references + color scheme</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <TasteKnobs values={taste} onChange={(v) => { setTaste(v); refreshPreview(); }} />
        <StyleReferences
          selectedRefs={selectedRefs}
          onChange={(r) => { setSelectedRefs(r); refreshPreview(); }}
          projectPath={projectPath}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <StyleDescription value={styleDescription} onChange={(v) => { setStyleDescription(v); refreshPreview(); }} />
        <ColorPicker colors={colors} onChange={(c) => { setColors(c); refreshPreview(); }} />
      </div>

      <DesignComposeOutlet
        contextSnippet={loadingContext ? 'Loading...' : preview}
        onSend={handleSend}
        onCopy={handleCopy}
        isSending={isSending}
        lastSent={lastSent}
        terminalMissing={!activeTerminalId}
      />
    </div>
  );
}
