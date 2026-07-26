// AssessmentCard — renders the objective assessment the tutor produces (the exact
// `**<Topic> — L<level>**` block from coach-persona.md), as a card with a mastery
// chip and the Demonstrated / Gaps / Verdict / Next-step breakdown. Also exports a
// parser so the tutor's raw text can be turned into structured data and logged to
// the progress store.

import { MasteryRing } from './MasteryRing';
import { cn } from '../../lib/utils';
import type { MasteryLevel } from '../../shared/learn/types';

export interface ParsedAssessment {
  topic: string;
  level: MasteryLevel;
  demonstrated: string;
  gaps: string;
  verdict: string;
  nextStep: string;
}

const LEVEL_NAMES: Record<MasteryLevel, string> = {
  L0: 'Unaware',
  L1: 'Aware',
  L2: 'Working',
  L3: 'Practitioner',
  L4: 'Expert',
  L5: 'Mastery',
};

/**
 * Parse the assessment block emitted by the tutor. Tolerant of em-dash/hyphen and
 * of "— L3" vs "- L3". Returns null if the header line isn't found.
 */
export function parseAssessmentBlock(md: string): ParsedAssessment | null {
  const header = md.match(/\*\*(.+?)\s*[—\-:]\s*L([0-5])\*\*/);
  if (!header) return null;
  const topic = header[1].trim();
  const level = `L${header[2]}` as MasteryLevel;

  const field = (name: string): string => {
    const re = new RegExp(`${name}\\s*:\\s*(.+?)(?:\\n\\s*[-*]|\\n\\n|$)`, 'is');
    const m = md.match(re);
    return m ? m[1].trim() : '';
  };

  return {
    topic,
    level,
    demonstrated: field('Demonstrated'),
    gaps: field('Gaps'),
    verdict: field('Verdict'),
    nextStep: field('Next step'),
  };
}

export interface AssessmentCardProps {
  assessment: ParsedAssessment;
  target?: MasteryLevel;
  assessedAt?: number;
}

export function AssessmentCard({ assessment, target, assessedAt }: AssessmentCardProps) {
  const { topic, level, demonstrated, gaps, verdict, nextStep } = assessment;
  return (
    <article className="lyceum-assess" aria-label={`Assessment: ${topic}`}>
      <header className="lyceum-assess-head">
        <MasteryRing level={level} target={target} size={48} strokeWidth={4} animated />
        <div className="lyceum-assess-head-text">
          <div className="lyceum-assess-topic">{topic}</div>
          <div className="lyceum-assess-level">
            <span className={cn('lyceum-assess-chip', `lvl-${level}`)}>{level}</span>
            <span className="lyceum-assess-levelname">{LEVEL_NAMES[level]}</span>
            {target && target !== level ? (
              <span className="lyceum-assess-target">target {target}</span>
            ) : null}
          </div>
        </div>
      </header>

      <dl className="lyceum-assess-body">
        <Row label="Demonstrated" tone="good" value={demonstrated} />
        <Row label="Gaps" tone="warn" value={gaps} />
        <Row label="Verdict" tone="neutral" value={verdict} />
        <Row label="Next step" tone="action" value={nextStep} />
      </dl>

      {assessedAt ? (
        <footer className="lyceum-assess-foot">
          Assessed {new Date(assessedAt).toLocaleString()}
        </footer>
      ) : null}
    </article>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone: string }) {
  if (!value) return null;
  return (
    <div className={cn('lyceum-assess-row', `tone-${tone}`)}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
