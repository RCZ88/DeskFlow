import React from 'react';

export function ConversationDemo() {
  return (
    <div className="space-y-1.5 max-h-32 overflow-y-auto">
      {[
        { role: 'user', text: 'Can you explain attention?' },
        { role: 'ai', text: 'Attention lets each token look at all other tokens to decide what to focus on.' },
        { role: 'user', text: 'Why is it better than RNNs?' },
        { role: 'ai', text: 'It processes all tokens in parallel and captures long-range dependencies directly.' },
      ].map((msg, i) => (
        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`px-2.5 py-1.5 rounded-lg text-[11px] max-w-[80%] ${
            msg.role === 'user' ? 'bg-clay-500/15 text-clay-300 rounded-br-none' : 'bg-zinc-800/60 text-zinc-300 rounded-bl-none'
          }`}>{msg.text}</div>
        </div>
      ))}
    </div>
  );
}
