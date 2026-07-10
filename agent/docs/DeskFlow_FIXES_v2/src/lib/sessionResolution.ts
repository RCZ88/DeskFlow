export interface ResolvedSession {
  sessionId: string | null;
  terminalId: string | null;
  source: 'parent' | 'active' | 'none';
}

export function resolveSessionForCheck(
  check: { session_id?: string },
  parent: { session_id?: string | null; terminal_id?: string | null },
  activeTerminalId: string | null,
  sessions: Array<{ id: string; terminal_id: string | null; status: string }>,
): ResolvedSession {
  if (check.session_id) {
    const session = sessions.find(s => s.id === check.session_id && s.status === 'active');
    if (session?.terminal_id) {
      return { sessionId: session.id, terminalId: session.terminal_id, source: 'parent' };
    }
  }

  if (parent.session_id) {
    const session = sessions.find(s => s.id === parent.session_id && s.status === 'active');
    if (session?.terminal_id) {
      return { sessionId: session.id, terminalId: session.terminal_id, source: 'parent' };
    }
  }

  if (parent.terminal_id) {
    const session = sessions.find(s => s.terminal_id === parent.terminal_id && s.status === 'active');
    return {
      sessionId: session?.id || null,
      terminalId: parent.terminal_id,
      source: 'parent',
    };
  }

  if (activeTerminalId) {
    const session = sessions.find(s => s.terminal_id === activeTerminalId && s.status === 'active');
    return {
      sessionId: session?.id || null,
      terminalId: activeTerminalId,
      source: 'active',
    };
  }

  return { sessionId: null, terminalId: null, source: 'none' };
}
