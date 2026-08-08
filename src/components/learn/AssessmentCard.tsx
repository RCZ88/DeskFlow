import { useState } from 'react';
import { CheckCircle, XCircle, ClipboardCheck, ChevronDown, ChevronUp } from 'lucide-react';

interface Question {
  id: string;
  type: 'multiple-choice' | 'short-answer' | 'code-reading';
  prompt: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  userAnswer?: string;
}

interface AssessmentCardProps {
  title: string;
  questions: Question[];
  onComplete?: (results: { questionId: string; correct: boolean }[]) => void;
  compact?: boolean;
}

export function AssessmentCard({
  title,
  questions,
  onComplete,
  compact = false,
}: AssessmentCardProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [expanded, setExpanded] = useState(!compact);

  const results = questions.map((q) => ({
    questionId: q.id,
    correct: (answers[q.id] ?? '').trim().toLowerCase() === q.correctAnswer.trim().toLowerCase(),
  }));
  const score = results.filter((r) => r.correct).length;
  const allCorrect = score === questions.length;

  const handleAnswer = (qId: string, value: string) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const handleSubmit = () => {
    setSubmitted(true);
    onComplete?.(results);
  };

  const handleReset = () => {
    setAnswers({});
    setSubmitted(false);
  };

  return (
    <div className={`lyceum-assessment${compact ? ' compact' : ''}`}>
      <button
        className="lyceum-assessment-header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="lyceum-assessment-title-row">
          <ClipboardCheck size={16} />
          <h3 className="lyceum-assessment-title">{title}</h3>
          {submitted && (
            <span className={`lyceum-assessment-score${allCorrect ? ' perfect' : ''}`}>
              {score}/{questions.length}
            </span>
          )}
          {!submitted && Object.keys(answers).length > 0 && (
            <span className="text-[11px] text-zinc-500">
              {Object.keys(answers).length}/{questions.length} answered
            </span>
          )}
        </div>
        {compact && (expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
      </button>

      {expanded && (
        <div className="lyceum-assessment-body">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className={`lyceum-assessment-question${submitted ? (results[idx].correct ? ' correct' : ' incorrect') : ''}`}
            >
              <div className="lyceum-assessment-q-header">
                <span className="lyceum-assessment-q-num">{idx + 1}.</span>
                <span className="lyceum-assessment-q-type">{q.type}</span>
              </div>
              <p className="lyceum-assessment-q-prompt">{q.prompt}</p>

              {q.type === 'multiple-choice' && q.options ? (
                <div className="lyceum-assessment-options">
                  {q.options.map((opt) => {
                    const isSelected = answers[q.id] === opt;
                    const isCorrectOpt = opt === q.correctAnswer;
                    let optClass = 'lyceum-assessment-option';
                    if (submitted && isCorrectOpt) optClass += ' correct';
                    if (submitted && isSelected && !isCorrectOpt) optClass += ' incorrect';
                    if (isSelected && !submitted) optClass += ' selected';
                    return (
                      <button
                        key={opt}
                        className={optClass}
                        onClick={() => handleAnswer(q.id, opt)}
                        disabled={submitted}
                      >
                        {submitted && isCorrectOpt && <CheckCircle size={14} />}
                        {submitted && isSelected && !isCorrectOpt && <XCircle size={14} />}
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <textarea
                  className="lyceum-assessment-textarea"
                  value={answers[q.id] ?? ''}
                  onChange={(e) => handleAnswer(q.id, e.target.value)}
                  placeholder="Type your answer..."
                  disabled={submitted}
                  rows={3}
                />
              )}

              {submitted && (
                <div className="lyceum-assessment-explanation">
                  <p className="lyceum-assessment-explanation-text">{q.explanation}</p>
                </div>
              )}
            </div>
          ))}

          <div className="lyceum-assessment-actions">
            {!submitted ? (
              <button
                className="lyceum-assessment-submit"
                onClick={handleSubmit}
                disabled={Object.keys(answers).length < questions.length}
              >
                Submit Answers
              </button>
            ) : (
              <button className="lyceum-assessment-reset" onClick={handleReset}>
                Try Again
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export type { Question };

// ── Assessment block parsing (tutor answer assessments) ──

export interface ParsedAssessment {
  topic: string;
  level: string; // L0-L5
  demonstrated: string;
  gaps: string;
  verdict: string;
  nextStep: string;
}

/**
 * Parse the tutor assessment block from the end of an answer_md string.
 * Format:
 *   **<Topic> — L<level>**
 *   - Demonstrated: …
 *   - Gaps: …
 *   - Verdict: …
 *   - Next step: …
 */
export function parseAssessmentBlock(answerMd: string): ParsedAssessment | null {
  const lines = answerMd.split('\n').map((l) => l.trim()).filter(Boolean);
  // Find the assessment header line
  const headerIdx = lines.findIndex((l) => /^\*\*.+\u2014\s*L[0-5]\*\*$/.test(l));
  if (headerIdx === -1) return null;

  const header = lines[headerIdx];
  const topicMatch = header.match(/^\*\*(.+?)\s*\u2014\s*/);
  const levelMatch = header.match(/L([0-5])/);
  if (!topicMatch || !levelMatch) return null;

  const result: ParsedAssessment = {
    topic: topicMatch[1].trim(),
    level: `L${levelMatch[1]}`,
    demonstrated: '',
    gaps: '',
    verdict: '',
    nextStep: '',
  };

  // Parse the following list items
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    const demoMatch = line.match(/^-\s*Demonstrated:\s*(.+)/i);
    if (demoMatch) { result.demonstrated = demoMatch[1]; continue; }
    const gapsMatch = line.match(/^-\s*Gaps:\s*(.+)/i);
    if (gapsMatch) { result.gaps = gapsMatch[1]; continue; }
    const verdictMatch = line.match(/^-\s*Verdict:\s*(.+)/i);
    if (verdictMatch) { result.verdict = verdictMatch[1]; continue; }
    const nextMatch = line.match(/^-\s*Next step:\s*(.+)/i);
    if (nextMatch) { result.nextStep = nextMatch[1]; continue; }
    // Stop at next heading or blank-line break
    if (line.startsWith('#')) break;
  }

  return result;
}

/**
 * Render a parsed assessment as a structured card component.
 */
export function AssessmentCardBlock({ assessment, target, assessedAt }: {
  assessment: ParsedAssessment;
  target?: string;
  assessedAt?: number;
}) {
  const levelNum = parseInt(assessment.level[1], 10);
  const targetNum = target ? parseInt(target[1], 10) : 2;
  const meetsTarget = levelNum >= targetNum;

  return (
    <div className="lyceum-assessment-block">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-zinc-200">{assessment.topic}</h4>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
            meetsTarget ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
          }`}>
            {assessment.level}
          </span>
          {target && (
            <span className="text-xs text-zinc-600">Target: {target}</span>
          )}
        </div>
      </div>
      <div className="space-y-1.5 text-xs">
        <Row label="Demonstrated" text={assessment.demonstrated} color="text-emerald-400" />
        <Row label="Gaps" text={assessment.gaps} color="text-amber-400" />
        <Row label="Verdict" text={assessment.verdict} color={meetsTarget ? 'text-emerald-400' : 'text-amber-400'} />
        <Row label="Next step" text={assessment.nextStep} color="text-amber-400" />
      </div>
      {assessedAt && (
        <div className="mt-2 text-[10px] text-zinc-600">
          Assessed {new Date(assessedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}

function Row({ label, text, color }: { label: string; text: string; color: string }) {
  if (!text) return null;
  return (
    <div className="flex gap-2">
      <span className="font-medium text-zinc-400 shrink-0 w-20">{label}:</span>
      <span className={color}>{text}</span>
    </div>
  );
}
