import { Bot, GitBranch } from 'lucide-react';
import AgentCommsPanel from '../components/agentic/AgentCommsPanel';
import SessionGroupPanel from '../components/agentic/SessionGroupPanel';
import BrainStatusPanel from '../components/agentic/BrainStatusPanel';
import ContextDashboard from '../components/agentic/ContextDashboard';

export default function AgenticSystemPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1400px] mx-auto p-6">
        <div className="flex items-center gap-3 mb-1">
          <Bot size={22} className="text-indigo-400" />
          <h1 className="text-xl font-semibold text-zinc-100">Agentic System</h1>
        </div>
        <p className="text-sm text-zinc-500 mb-6 flex items-center gap-1.5">
          <GitBranch size={13} /> Multi-agent communication, session groups, and the context brain — unified.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="lg:row-span-2 h-[520px]">
            <AgentCommsPanel />
          </div>
          <div className="h-[520px]">
            <ContextDashboard />
          </div>
          <div className="h-[520px]">
            <SessionGroupPanel />
          </div>
          <div className="lg:col-span-2 h-[520px]">
            <BrainStatusPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
