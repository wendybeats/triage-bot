'use client';

import { useState } from 'react';
import { DigestItem as DigestItemType } from '@/types';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SourceIcon } from '@/components/SourceIcon';
import { ThreadHistory } from '@/components/ThreadHistory';
import { ChevronDown, ChevronUp, RefreshCw, Check, Clock, ArrowRight, ExternalLink, TrendingUp } from 'lucide-react';

const tierColors: Record<string, string> = {
  tier_1: 'border-l-priority-high',
  tier_2: 'border-l-priority-medium',
  low_priority: 'border-l-priority-low',
};

const tierLabels: Record<string, string> = {
  tier_1: 'High Priority',
  tier_2: 'Medium',
  low_priority: 'Low',
};

interface DigestItemProps {
  item: DigestItemType;
  onStatusChange: (id: string, status: string) => void;
  onRefreshScore: (id: string) => void;
  onPromoteToNotion: (id: string) => void;
}

export function DigestItemCard({ item, onStatusChange, onRefreshScore, onPromoteToNotion }: DigestItemProps) {
  const [isThreadOpen, setIsThreadOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (action: () => void) => {
    setIsLoading(true);
    try { await action(); } finally { setIsLoading(false); }
  };

  return (
    <Card className={`border-l-4 ${tierColors[item.tier]} transition-all hover:shadow-md`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={item.tier}>{tierLabels[item.tier]}</Badge>
            {item.status_suggestion && (
              <Badge variant="default">Suggested: {item.status_suggestion}</Badge>
            )}
            {item.escalation_count > 0 && (
              <Badge variant="escalation">
                <TrendingUp className="mr-1 h-3 w-3" />
                {item.escalation_count}x escalated
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <SourceIcon source={item.source} />
            <Badge variant={`status_${item.status}` as 'status_new' | 'status_in_progress' | 'status_done' | 'status_deferred'}>{item.status.replace('_', ' ')}</Badge>
          </div>
        </div>
        <div className="mt-1 text-sm text-gray-400">
          {item.sender} → You
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-sm leading-relaxed text-dark-text">
          {item.initial_message.length > 300
            ? `${item.initial_message.substring(0, 300)}...`
            : item.initial_message}
        </p>

        {item.thread_history.length > 0 && (
          <div className="mt-3">
            <button
              onClick={() => setIsThreadOpen(!isThreadOpen)}
              className="flex items-center gap-1 text-sm text-primary-400 hover:text-primary-300 transition-colors"
            >
              {isThreadOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {item.thread_history.length} message{item.thread_history.length > 1 ? 's' : ''} in thread
              {item.escalation_count > 0 && (
                <span className="ml-2 text-red-400 text-xs">Priority changed {item.escalation_count}x</span>
              )}
            </button>
            {isThreadOpen && <ThreadHistory messages={item.thread_history} />}
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="default">Impact: {item.impact_score}/10</Badge>
          <Badge variant="default">Effort: {item.effort}</Badge>
          <Badge variant="default">OKR: {item.okr_alignment}</Badge>
        </div>

        {item.ai_reasoning && (
          <p className="mt-2 text-xs text-gray-500 italic">
            AI: {item.ai_reasoning}
          </p>
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2">
        {item.link && (
          <a href={item.link} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm">
              <ExternalLink className="mr-1 h-3 w-3" />
              Source
            </Button>
          </a>
        )}
        <Button
          variant="ghost"
          size="sm"
          disabled={isLoading}
          onClick={() => handleAction(() => onRefreshScore(item.id))}
        >
          <RefreshCw className={`mr-1 h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          Re-score
        </Button>
        {item.status !== 'done' && (
          <Button
            variant="success"
            size="sm"
            disabled={isLoading}
            onClick={() => handleAction(() => onStatusChange(item.id, 'done'))}
          >
            <Check className="mr-1 h-3 w-3" />
            Done
          </Button>
        )}
        {item.status !== 'deferred' && (
          <Button
            variant="secondary"
            size="sm"
            disabled={isLoading}
            onClick={() => handleAction(() => onStatusChange(item.id, 'deferred'))}
          >
            <Clock className="mr-1 h-3 w-3" />
            Defer
          </Button>
        )}
        {item.status !== 'in_progress' && item.status !== 'done' && (
          <Button
            variant="secondary"
            size="sm"
            disabled={isLoading}
            onClick={() => handleAction(() => onStatusChange(item.id, 'in_progress'))}
          >
            Start
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          disabled={isLoading}
          onClick={() => handleAction(() => onPromoteToNotion(item.id))}
        >
          <ArrowRight className="mr-1 h-3 w-3" />
          Notion
        </Button>
      </CardFooter>
    </Card>
  );
}
