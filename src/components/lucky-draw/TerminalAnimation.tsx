'use client';

import { useState, useEffect } from 'react';

const lines = [
  'Initializing registration sequence...',
  'Connecting to event server... [OK]',
  'Authenticating user credentials...',
  'Encrypting session... [DONE]',
  'Submitting registration ticket...',
  'Awaiting confirmation...',
  'Server response: 200 OK',
  'Registration successful!',
];

const TOTAL_DURATION = 4000; // 4 seconds

export function TerminalAnimation({ onComplete }: { onComplete: () => void }) {
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  
  useEffect(() => {
    let i = 0;
    const intervalDelay = TOTAL_DURATION / lines.length;
    const interval = setInterval(() => {
      if (i < lines.length) {
        setVisibleLines(prev => [...prev, lines[i]]);
        i++;
      } else {
        clearInterval(interval);
        setTimeout(onComplete, 500);
      }
    }, intervalDelay);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="bg-gray-900 text-green-400 font-mono text-sm p-4 rounded-lg h-64 overflow-y-auto">
      {visibleLines.map((line, index) => (
        <div key={index} className="whitespace-pre-wrap">
          <span className="text-gray-500 mr-2">&gt;</span>{line}
        </div>
      ))}
       <div className="whitespace-pre-wrap">
          <span className="text-gray-500 mr-2">&gt;</span>
          <span className="animate-pulse">_</span>
        </div>
    </div>
  );
}
