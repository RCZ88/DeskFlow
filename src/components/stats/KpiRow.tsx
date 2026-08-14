import { Bot, DollarSign, Activity, Wrench, TrendingUp, CalendarDays } from 'lucide-react';
import { KpiCard, type KpiTrend } from './KpiCard';

export interface KpiData {
  totalTokens: string;
  totalCost: string;
  activeSessions: string;
  toolsModels: string;
  totalTokensNum?: number;
  totalCostNum?: number;
  activeSessionsNum?: number;
  toolsModelsNum?: number;
  dailyAvgTokens?: string;
  dailyAvgCost?: string;
  dailyAvgMessages?: string;
  dailyAvgTokensNum?: number;
  dailyAvgCostNum?: number;
  dailyAvgMessagesNum?: number;
  activeDays?: number;
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
    <div className="space-y-3">
      {/* Primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={Bot}
          accent="violet"
          value={data.totalTokens}
          numericValue={data.totalTokensNum}
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
          numericValue={data.totalCostNum}
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
          numericValue={data.activeSessionsNum}
          label="AI Sessions"
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
          numericValue={data.toolsModelsNum}
          label="Tools / Models"
          trend={trends?.toolsModels}
          loading={loading}
          empty={empty}
          error={error}
          onRetry={onRetry}
          delay={0.15}
        />
      </div>
      {/* Daily Averages */}
      {data.activeDays && data.activeDays > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <KpiCard
            icon={TrendingUp}
            accent="violet"
            value={data.dailyAvgTokens || '—'}
            numericValue={data.dailyAvgTokensNum}
            label={`Tokens/Day (${data.activeDays}d)`}
            loading={loading}
            empty={empty}
            error={error}
            onRetry={onRetry}
            delay={0.2}
          />
          <KpiCard
            icon={DollarSign}
            accent="emerald"
            value={data.dailyAvgCost || '—'}
            numericValue={data.dailyAvgCostNum}
            label="Cost/Day"
            loading={loading}
            empty={empty}
            error={error}
            onRetry={onRetry}
            delay={0.25}
          />
          <KpiCard
            icon={CalendarDays}
            accent="amber"
            value={data.dailyAvgMessages || '—'}
            numericValue={data.dailyAvgMessagesNum}
            label="Messages/Day"
            loading={loading}
            empty={empty}
            error={error}
            onRetry={onRetry}
            delay={0.3}
          />
        </div>
      )}
    </div>
  );
}
