import { Bot, DollarSign, Activity, Wrench } from 'lucide-react';
import { KpiCard, type KpiTrend } from './KpiCard';

export interface KpiData {
  totalTokens: string;
  totalCost: string;
  activeSessions: string;
  toolsModels: string;
  loading?: boolean;
  empty?: boolean;
  error?: string;
  onRetry?: () => void;
  trends?: {
    totalTokens?: KpiTrend;
    totalCost?: KpiTrend;
    activeSessions?: KpiTrend;
    toolsModels?: KpiTrend;
  };
}

export function KpiRow({ data }: { data: KpiData }) {
  const { loading, empty, error, onRetry, trends } = data;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard
        icon={Bot}
        accent="violet"
        value={data.totalTokens}
        label="Total Tokens"
        trend={trends?.totalTokens}
        loading={loading}
        empty={empty}
        error={error}
        onRetry={onRetry}
        delay={0}
      />
      <KpiCard
        icon={DollarSign}
        accent="emerald"
        value={data.totalCost}
        label="Total Cost"
        trend={trends?.totalCost}
        loading={loading}
        empty={empty}
        error={error}
        onRetry={onRetry}
        delay={0.05}
      />
      <KpiCard
        icon={Activity}
        accent="pink"
        value={data.activeSessions}
        label="Active Sessions"
        trend={trends?.activeSessions}
        loading={loading}
        empty={empty}
        error={error}
        onRetry={onRetry}
        delay={0.1}
      />
      <KpiCard
        icon={Wrench}
        accent="cyan"
        value={data.toolsModels}
        label="Tools / Models"
        trend={trends?.toolsModels}
        loading={loading}
        empty={empty}
        error={error}
        onRetry={onRetry}
        delay={0.15}
      />
    </div>
  );
}
