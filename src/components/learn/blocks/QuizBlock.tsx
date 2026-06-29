import React, { useState } from 'react';
import type { QuizBlock } from '../../../shared/learn/types';

interface Props {
  block: QuizBlock;
  onSubmit: (response: string) => void;
}

export function QuizBlock({ block, onSubmit }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ correct: boolean; explanation: string } | null>(null);

  const handleSubmit = async () => {
    const response = block.format === 'mcq'
      ? String(selected)
      : block.format === 'numeric'
      ? textAnswer
      : textAnswer;

    if (!response && response !== 0) return;

    const res = await onSubmit(response);
    // If onSubmit returns a result directly (sync), use it
    // Otherwise the parent handles evidence recording
    if (block.format === 'mcq') {
      const correct = selected === (block.answer_key as number);
      setResult({
        correct,
        explanation: correct
          ? 'Correct! Well done.'
          : `The correct answer is: ${block.options?.[block.answer_key as number]}`,
      });
    }
    setSubmitted(true);
  };

  return (
    <div className="my-6 p-5 rounded-xl border border-indigo-500/20 bg-indigo-500/5" data-block-id={block.id}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📝</span>
        <span className="text-sm font-medium text-indigo-300">
          Quiz · {block.format.toUpperCase()} · Target: {block.level}
        </span>
      </div>

      <p className="text-zinc-200 mb-4">{block.q}</p>

      {/* MCQ */}
      {block.format === 'mcq' && block.options && (
        <div className="space-y-2 mb-4">
          {block.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => !submitted && setSelected(i)}
              className={`w-full text-left px-4 py-3 rounded-lg border transition text-sm ${
                submitted
                  ? i === (block.answer_key as number)
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                    : i === selected
                    ? 'border-red-500/50 bg-red-500/10 text-red-300'
                    : 'border-zinc-700/40 text-zinc-500'
                  : selected === i
                  ? 'border-indigo-500/50 bg-indigo-500/15 text-indigo-200'
                  : 'border-zinc-700/40 text-zinc-300 hover:border-zinc-600'
              }`}
              disabled={submitted}
            >
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-zinc-600 text-xs mr-2 shrink-0">
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
              {submitted && i === (block.answer_key as number) && <span className="ml-2 text-emerald-400">✓</span>}
              {submitted && i === selected && i !== (block.answer_key as number) && <span className="ml-2 text-red-400">✗</span>}
            </button>
          ))}
        </div>
      )}

      {/* Numeric */}
      {block.format === 'numeric' && (
        <div className="mb-4">
          <input
            type="number"
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            className="w-full max-w-[200px] px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-200 text-sm focus:border-indigo-500/50 focus:outline-none"
            placeholder="Enter number..."
            disabled={submitted}
          />
        </div>
      )}

      {/* Open */}
      {block.format === 'open' && (
        <div className="mb-4">
          <textarea
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-200 text-sm focus:border-indigo-500/50 focus:outline-none resize-y min-h-[80px]"
            placeholder="Write your answer..."
            disabled={submitted}
          />
          {submitted && block.rubric && (
            <div className="mt-3 p-3 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
              <div className="text-xs text-zinc-400 mb-1">Rubric:</div>
              {Object.entries(block.rubric).map(([level, desc]) => (
                <div key={level} className="text-xs text-zinc-500">
                  <span className="text-zinc-400 font-medium">{level}:</span> {desc}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!submitted && (
        <button
          onClick={handleSubmit}
          className="px-4 py-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-sm font-medium transition border border-indigo-500/30"
        >
          Submit Answer
        </button>
      )}

      {result && (
        <div className={`mt-3 p-3 rounded-lg ${result.correct ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
          <div className={`text-sm font-medium ${result.correct ? 'text-emerald-400' : 'text-amber-400'}`}>
            {result.correct ? '✓ Correct!' : 'Not quite'}
          </div>
          <div className="text-xs text-zinc-400 mt-1">{result.explanation}</div>
        </div>
      )}
    </div>
  );
}
