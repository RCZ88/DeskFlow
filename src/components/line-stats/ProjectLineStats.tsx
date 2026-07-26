import { useState, useEffect, useCallback } from 'react';
import LineStatsCards from './LineStatsCards';
import FileTypeChart from './FileTypeChart';
import FileDetailTable from './FileDetailTable';
import ScanControls from './ScanControls';
import EmptyLineStats from './EmptyLineStats';
import type { LineStatsData, ScanOptions } from '../../types/line-stats';

interface Props {
  projectId: string;
  projectPath: string;
}

export default function ProjectLineStats({ projectId, projectPath }: Props) {
  const [data, setData] = useState<LineStatsData | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCached = useCallback(async () => {
    try {
      const result = await (window as any).deskflowAPI?.getProjectLineStats?.(projectId);
      if (result?.success && result.data) setData(result.data);
    } catch {}
  }, [projectId]);

  useEffect(() => { loadCached(); }, [loadCached]);

  const handleScan = async (options: ScanOptions) => {
    setIsScanning(true);
    setError(null);
    try {
      const result = await (window as any).deskflowAPI?.countProjectLines?.(projectPath, projectId, options);
      if (result?.success) {
        setData({ files: result.data.files, summary: result.data.summary, scannedAt: new Date().toISOString(), totalFiles: result.data.totalFiles });
      } else {
        setError(result?.error || 'Scan failed');
      }
    } catch (e: any) { setError(e.message || 'Scan failed'); }
    finally { setIsScanning(false); }
  };

  const totals = data ? data.files.reduce((acc, f) => ({
    totalLines: acc.totalLines + f.totalLines, codeLines: acc.codeLines + f.codeLines,
    commentLines: acc.commentLines + f.commentLines, blankLines: acc.blankLines + f.blankLines,
  }), { totalLines: 0, codeLines: 0, commentLines: 0, blankLines: 0 }) : null;

  return (
    <div className="space-y-4">
      <ScanControls onScan={handleScan} isScanning={isScanning} lastScanned={data?.scannedAt || null} hasData={!!data} />
      {error && <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-2.5 text-xs text-red-400">{error}</div>}
      {!data && !isScanning ? (
        <EmptyLineStats onScan={() => handleScan({ excludeExtensions: ['.md', '.json', '.lock', '.min.js'] })} />
      ) : totals ? (
        <>
          <LineStatsCards totalFiles={data!.totalFiles} totalLines={totals.totalLines} codeLines={totals.codeLines} commentLines={totals.commentLines} blankLines={totals.blankLines} />
          <FileTypeChart summary={data!.summary} />
          <FileDetailTable files={data!.files} />
        </>
      ) : null}
    </div>
  );
}
