/**
 * AgentHostService
 * 
 * Manages the lifecycle of AI agent processes and tracks their states.
 * Inspired by VS Code's Agent Host Protocol implementation.
 */

import { ipcMain } from 'electron';
import { getAgentConfig, AgentConfig, detectAgentPrompt, AgentVerifyResult } from '../main';

// Agent phases
export type AgentPhase = 
  | 'launching'    // Process spawned, waiting for ready signal
  | 'ready'        // Agent is ready and waiting for input
  | 'busy'         // Agent is processing a request
  | 'completed'    // Agent has finished and is ready for next input
  | 'action_required' // Agent is waiting for human input/action
  | 'timeout'      // Agent failed to respond within expected time
  | 'error'        // Agent encountered an error;

export interface AgentState {
  terminalId: string;
  agentType: string;
  phase: AgentPhase;
  dataBuffer: string; // Accumulated output for parsing
  idleSeq: number;    // Sequence number for idle events
  lastActivity: number; // Timestamp of last activity
  messageId: string | null; // Current message being processed
  pendingWrites: Array<{ data: string; resolve: (value: unknown) => void; reject: (reason?: any) => void }>;
}

interface AgentHostServiceOptions {
  checkInactivityTimeout?: number; // ms to consider agent inactive
  attentionTimeout?: number; // ms of inactivity before flagging for attention
}

export class AgentHostService {
  private agentStates: Map<string, AgentState> = new Map();
  private attentionTimers: Map<string, NodeJS.Timeout> = new Map();
  
  private checkInactivityTimeout: number;
  private attentionTimeout: number;

  constructor(options: AgentHostServiceOptions = {}) {
    this.checkInactivityTimeout = options.checkInactivityTimeout ?? 30000; // 30 seconds
    this.attentionTimeout = options.attentionTimeout ?? 10000; // 10 seconds
    
    // Set up IPC handlers
    this.setupIPCHandlers();
  }

  private setupIPCHandlers() {
    // Handle terminal data to update agent state
    ipcMain.handle('agent:update-state', async (_event, terminalId: string, data: string) => {
      return this.updateAgentState(terminalId, data);
    });

    // Handle agent ready signal
    ipcMain.handle('agent:ready', async (_event, terminalId: string) => {
      return this.setAgentReady(terminalId);
    });

    // Handle agent idle signal
    ipcMain.handle('agent:idle', async (_event, { terminalId, seq }: { terminalId: string; seq: number }) => {
      return this.setAgentIdle(terminalId, seq);
    });

    // Handle agent timeout
    ipcMain.handle('agent:timeout', async (_event, { terminalId, agentType }: { terminalId: string; agentType: string }) => {
      return this.setAgentTimeout(terminalId, agentType);
    });

    // Handle agent init error
    ipcMain.handle('agent:init-error', async (_event, { terminalId, agentType, reason, detail, installHint, hint }: 
      { terminalId: string; agentType: string; reason: string; detail: string; installHint?: string; hint?: string }) => {
      return this.setAgentError(terminalId, agentType, reason, detail, installHint, hint);
    });

    // Handle terminal exit/cleanup
    ipcMain.handle('terminal:exit', async (_event, terminalId: string) => {
      return this.cleanupTerminal(terminalId);
    });
  }

  /**
   * Update agent state based on incoming data
   */
  private updateAgentState(terminalId: string, data: string): AgentState | null {
    const state = this.agentStates.get(terminalId);
    if (!state) return null;

    // Update buffer and last activity
    state.dataBuffer += data;
    state.lastActivity = Date.now();

    // Check for agent ready prompt in the buffer
    const agentConfig = getAgentConfig(state.agentType);
    const promptSeen = detectAgentPrompt(state.dataBuffer, state.agentType);

    // If we're launching and see the ready prompt, transition to ready
    if (state.phase === 'launching' && promptSeen) {
      return this.setAgentReady(terminalId);
    }

    // If we're busy and see the ready prompt, we've completed a task
    if (state.phase === 'busy' && promptSeen) {
      return this.setAgentCompleted(terminalId);
    }

    // Reset attention timer on any activity
    this.resetAttentionTimer(terminalId);

    return state;
  }

  /**
   * Set agent to ready state
   */
  private setAgentReady(terminalId: string): AgentState | null {
    const state = this.agentStates.get(terminalId);
    if (!state) return null;

    state.phase = 'ready';
    state.dataBuffer = ''; // Clear buffer on ready
    state.lastActivity = Date.now();
    
    // Clear any pending writes when ready
    this.flushPendingWrites(terminalId);

    // Start attention timer
    this.startAttentionTimer(terminalId);

    return state;
  }

  /**
   * Set agent to idle state (after completing a task)
   */
  private setAgentIdle(terminalId: string, seq: number): AgentState | null {
    const state = this.agentStates.get(terminalId);
    if (!state) return null;

    // Only update if this is a newer idle sequence
    if (seq >= state.idleSeq) {
      state.idleSeq = seq;
      state.phase = 'ready'; // Treat idle as ready for next input
      state.lastActivity = Date.now();
      
      // Reset attention timer
      this.resetAttentionTimer(terminalId);
    }

    return state;
  }

  /**
   * Set agent to busy state (processing a request)
   */
  setAgentBusy(terminalId: string): AgentState | null {
    const state = this.agentStates.get(terminalId);
    if (!state) return null;

    state.phase = 'busy';
    state.lastActivity = Date.now();
    
    // Stop attention timer when busy
    this.stopAttentionTimer(terminalId);

    return state;
  }

  /**
   * Set agent to completed state (finished processing)
   */
  private setAgentCompleted(terminalId: string): AgentState | null {
    const state = this.agentStates.get(terminalId);
    if (!state) return null;

    state.phase = 'completed';
    state.lastActivity = Date.now();
    
    // Start attention timer briefly to catch quick follow-ups
    this.startAttentionTimer(terminalId, 5000); // 5 second attention window

    return state;
  }

  /**
   * Set agent to action_required state (needs human input)
   */
  setAgentActionRequired(terminalId: string): AgentState | null {
    const state = this.agentStates.get(terminalId);
    if (!state) return null;

    state.phase = 'action_required';
    state.lastActivity = Date.now();
    
    // Stop attention timer - we already know attention is required
    this.stopAttentionTimer(terminalId);

    return state;
  }

  /**
   * Set agent to timeout state
   */
  private setAgentTimeout(terminalId: string, agentType: string): AgentState | null {
    const state = this.agentStates.get(terminalId);
    if (!state) return null;

    state.phase = 'timeout';
    state.lastActivity = Date.now();
    
    // Stop attention timer
    this.stopAttentionTimer(terminalId);

    return state;
  }

  /**
   * Set agent to error state
   */
  private setAgentError(
    terminalId: string, 
    agentType: string, 
    reason: string, 
    detail: string,
    installHint?: string,
    hint?: string
  ): AgentState | null {
    const state = this.agentStates.get(terminalId);
    if (!state) return null;

    state.phase = 'error';
    state.lastActivity = Date.now();
    
    // Stop attention timer
    this.stopAttentionTimer(terminalId);

    return state;
  }

  /**
   * Register a new terminal/agent
   */
  registerTerminal(terminalId: string, agentType: string): AgentState {
    const state: AgentState = {
      terminalId,
      agentType,
      phase: 'launching',
      dataBuffer: '',
      idleSeq: 0,
      lastActivity: Date.now(),
      messageId: null,
      pendingWrites: []
    };

    this.agentStates.set(terminalId, state);
    
    // Start attention timer for launching state
    this.startAttentionTimer(terminalId);

    return state;
  }

  /**
   * Clean up terminal state
   */
  private cleanupTerminal(terminalId: string): void {
    this.stopAttentionTimer(terminalId);
    this.agentStates.delete(terminalId);
  }

  /**
   * Get current agent state
   */
  getAgentState(terminalId: string): AgentState | null {
    return this.agentStates.get(terminalId) || null;
  }

  /**
   * Get all agent states
   */
  getAllAgentStates(): Record<string, AgentState> {
    const states: Record<string, AgentState> = {};
    this.agentStates.forEach((state, terminalId) => {
      states[terminalId] = state;
    });
    return states;
  }

  /**
   * Start attention timer for a terminal
   */
  private startAttentionTimer(terminalId: string, timeoutMs: number = this.attentionTimeout): void {
    this.stopAttentionTimer(terminalId); // Clear any existing timer
    
    const timeout = setTimeout(() => {
      this.checkForAttention(terminalId);
    }, timeoutMs);
    
    this.attentionTimers.set(terminalId, timeout);
  }

  /**
   * Stop attention timer for a terminal
   */
  private stopAttentionTimer(terminalId: string): void {
    const timeout = this.attentionTimers.get(terminalId);
    if (timeout) {
      clearTimeout(timeout);
      this.attentionTimers.delete(terminalId);
    }
  }

  /**
   * Reset attention timer (restart with default timeout)
   */
  private resetAttentionTimer(terminalId: string): void {
    this.startAttentionTimer(terminalId);
  }

  /**
   * Check if agent needs attention based on inactivity
   */
  private checkForAttention(terminalId: string): void {
    const state = this.agentStates.get(terminalId);
    if (!state) return;

    // Don't check if already in action_required or error states
    if (state.phase === 'action_required' || state.phase === 'error') {
      return;
    }

    const timeInactive = Date.now() - state.lastActivity;
    if (timeInactive >= this.attentionTimeout) {
      // Agent has been inactive too long, flag for attention
      this.setAgentActionRequired(terminalId);
      
      // Notify via IPC that attention is needed
      // This will be handled by the renderer to show UI indicators
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      ipcMain.emit('agent:attention-needed', { terminalId, agentType: state.agentType });
    }
  }

  /**
   * Flush pending writes when agent is ready
   */
  private flushPendingWrites(terminalId: string): void {
    const state = this.agentStates.get(terminalId);
    if (!state || state.pendingWrites.length === 0) return;

    // Resolve all pending writes
    const writes = [...state.pendingWrites];
    state.pendingWrites = [];
    
    writes.forEach(({ data, resolve, reject }) => {
      // In a real implementation, we would send the data to the terminal here
      // For now, we just resolve the promise
      resolve({ success: true });
    });
  }

  /**
   * Queue a write to be sent when agent is ready
   */
  queueWrite(terminalId: string, data: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const state = this.agentStates.get(terminalId);
      if (!state) {
        reject(new Error(`Agent state not found for terminal ${terminalId}`));
        return;
      }

      // If agent is ready, flush immediately
      if (state.phase === 'ready') {
        // In real implementation, send data directly
        resolve({ success: true });
        return;
      }

      // Otherwise queue for later
      state.pendingWrites.push({ data, resolve, reject });
    });
  }
}

// Export a singleton instance
export const agentHostService = new AgentHostService();