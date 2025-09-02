'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const successLines = [
  'Initializing registration sequence...',
  'Connecting to event server... [OK]',
  'Authenticating user credentials...',
  'Encrypting session... [DONE]',
  'Submitting registration ticket...',
  'Awaiting confirmation...',
  'Server response: 200 OK',
  'Registration successful!',
];

const failureLines = [
    'Initializing registration sequence...',
    'Connecting to event server... [OK]',
    'Authenticating user credentials...',
    'Encrypting session... [DONE]',
    'Submitting registration ticket...',
    'Awaiting confirmation...',
    'Server response: 400 Bad Request',
    'Registration Failed: Deadline passed.',
];

const TOTAL_DURATION = 4000; // 4 seconds

export function TerminalAnimation({ onComplete, success = true }: { onComplete: () => void, success?: boolean }) {
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const lines = success ? successLines : failureLines;
  
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
  }, [onComplete, lines]);

  const isErrorLine = (line: string) => !success && line && (line.includes('Failed') || line.includes('400'));

  return (
    <div className={cn("bg-gray-900 font-mono text-sm p-4 rounded-lg h-64 overflow-y-auto", success ? "text-green-400" : "text-red-400")}>
      {visibleLines.map((line, index) => (
        <div key={index} className={cn("whitespace-pre-wrap", isErrorLine(line) ? "text-red-500" : "text-green-400")}>
          <span className="text-gray-500 mr-2">></span>{line}
        </div>
      ))}
       <div className="whitespace-pre-wrap">
          <span className="text-gray-500 mr-2">></span>
          <span className={cn("animate-pulse", success ? "text-green-400" : "text-red-400")}>_</span>
        </div>
    </div>
  );
}
