'use client';

import { ThreadMessage } from '@/types';
import { format, parseISO } from 'date-fns';

interface ThreadHistoryProps {
  messages: ThreadMessage[];
}

export function ThreadHistory({ messages }: ThreadHistoryProps) {
  if (messages.length === 0) return null;

  return (
    <div className="mt-3 space-y-2 border-l-2 border-dark-border pl-4">
      {messages.map((msg, i) => (
        <div key={i} className="text-sm">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-medium text-gray-400">{msg.sender}</span>
            <span>
              {(() => {
                try { return format(parseISO(msg.timestamp), 'MMM d, h:mm a'); }
                catch { return msg.timestamp; }
              })()}
            </span>
          </div>
          <p className="mt-0.5 text-dark-text/80">{msg.text}</p>
          {msg.link && (
            <a
              href={msg.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary-400 hover:text-primary-300"
            >
              View source
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
