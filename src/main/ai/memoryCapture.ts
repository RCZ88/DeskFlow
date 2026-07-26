import type { MemoryEntry, MemoryCategory, MemoryTier, CaptureResult } from '../../types/memory';
import * as store from './memoryStore';

const CAPTURE_TRIGGERS = {
  explicit: /\[save-memory\]\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*(.+)/i,
  userCorrection: [
    /(?:you idiot|i told you|i already told you|no,? that's wrong|incorrect|you forgot|you keep|stop doing|never do|always do)/i,
    /(?:i said|i already said|as i mentioned|like i said|remember that|don't forget)/i,
    /(?:wrong|incorrect|not right|that's not|should be|needs to be|must be)/i,
  ],
  selfReflect: /(?:i made a mistake|i was wrong|i forgot|i should have|next time i will|lesson learned)/i,
};

export function captureMemoryFromMessage(
  message: string,
  sender: 'user' | 'agent',
  sessionId?: string,
  cycleNumber?: number,
): CaptureResult {
  const triggerType = detectTrigger(message, sender);
  if (!triggerType) return { captured: false, action: 'ignored' };

  const lesson = extractLesson(message, triggerType);
  if (!lesson || lesson.length < 15) return { captured: false, action: 'ignored' };

  const dedupKey = generateDedupKey(lesson);
  const existing = store.getMemoryByDedupKey(dedupKey);

  if (existing) {
    const correctedAt = [...existing.correctedAt, Date.now()];
    const newImportance = Math.min(1.0, existing.importance + 0.1);
    const newTier = recalcTier(newImportance, existing.accessCount);
    store.updateMemoryImportance(existing.id, newImportance, newTier, correctedAt);
    return { captured: true, action: 'updated', memory: { ...existing, importance: newImportance, tier: newTier, correctedAt } };
  }

  const memory: MemoryEntry = {
    id: crypto.randomUUID(),
    content: lesson,
    category: categorizeLesson(lesson, triggerType),
    tier: 'warm',
    importance: calculateInitialImportance(lesson, triggerType),
    accessCount: 0,
    lastAccessedAt: Date.now(),
    createdAt: Date.now(),
    correctedAt: [Date.now()],
    dedupKey,
    source: {
      type: triggerType === 'userCorrection' ? 'user_correction' : triggerType === 'selfReflect' ? 'agent_self_reflect' : 'manual',
      sessionId,
      cycleNumber,
      originalMessage: message.slice(0, 500),
    },
    decayRate: triggerType === 'userCorrection' ? 0.005 : 0.01,
    staleAfterDays: 90,
  };

  store.insertMemory(memory);
  return { captured: true, action: 'new', memory };
}

function detectTrigger(message: string, sender: 'user' | 'agent'): string | null {
  if (sender === 'agent' && CAPTURE_TRIGGERS.explicit.test(message)) return 'explicit';
  if (sender === 'agent' && CAPTURE_TRIGGERS.selfReflect.test(message)) return 'selfReflect';
  if (sender === 'user') {
    for (const pattern of CAPTURE_TRIGGERS.userCorrection) {
      if (pattern.test(message)) return 'userCorrection';
    }
  }
  return null;
}

function extractLesson(message: string, triggerType: string): string {
  if (triggerType === 'explicit') {
    const match = message.match(CAPTURE_TRIGGERS.explicit);
    return match ? match[3].trim() : '';
  }
  const sentences = message.match(/[^.!?]+[.!?]+/g) || [];
  let lesson = '';
  for (let i = 0; i < sentences.length; i++) {
    if (isCorrectionSentence(sentences[i])) {
      lesson = sentences[i].trim();
      if (i + 1 < sentences.length && sentences[i + 1].length < 100) {
        lesson += ' ' + sentences[i + 1].trim();
      }
      break;
    }
  }
  return lesson.slice(0, 200);
}

function isCorrectionSentence(s: string): boolean {
  return /(?:you idiot|i told you|wrong|incorrect|should be|never do|always do|don't forget)/i.test(s);
}

function generateDedupKey(content: string): string {
  return content.toLowerCase().replace(/\s+/g, ' ').replace(/[^a-z0-9 ]/g, '').slice(0, 60).trim();
}

function categorizeLesson(lesson: string, triggerType: string): MemoryCategory {
  if (/never|always|must not|do not/i.test(lesson)) return 'invariant';
  if (/because|root cause|the reason/i.test(lesson)) return 'root_cause';
  if (/pattern|usually|typically|convention/i.test(lesson)) return 'pattern';
  if (/prefer|like|instead of|rather/i.test(lesson)) return 'preference';
  if (/decided|choose|went with/i.test(lesson)) return 'decision';
  if (/workflow|process|steps? to/i.test(lesson)) return 'workflow';
  if (/error|fix|if you see|when.*happens/i.test(lesson)) return 'error_recovery';
  return 'correction';
}

function calculateInitialImportance(lesson: string, triggerType: string): number {
  let score = 0.5;
  if (triggerType === 'userCorrection') score += 0.2;
  if (triggerType === 'explicit') score += 0.15;
  if (/never|always|critical|important|must/i.test(lesson)) score += 0.15;
  if (/git clean|destructive|delete|wipe/i.test(lesson)) score += 0.2;
  return Math.min(1.0, score);
}

function recalcTier(importance: number, accessCount: number): MemoryTier {
  const accessBoost = Math.min(0.15, accessCount * 0.02);
  const effective = importance + accessBoost;
  if (effective >= 0.7) return 'hot';
  if (effective >= 0.4) return 'warm';
  return 'cold';
}
