'use client';

import { useState } from 'react';
import { DigestItem } from '@/types';
import { DigestItemCard } from '@/components/DigestItem';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DigestListProps {
  items: DigestItem[];
  onStatusChange: (id: string, status: string) => void;
  onRefreshScore: (id: string) => void;
  onPromoteToNotion: (id: string) => void;
}

interface TierGroup {
  key: string;
  label: string;
  variant: string;
  items: DigestItem[];
}

export function DigestList({ items, onStatusChange, onRefreshScore, onPromoteToNotion }: DigestListProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const groups: TierGroup[] = [
    {
      key: 'tier_1',
      label: 'High Priority',
      variant: 'tier_1',
      items: items.filter(i => i.tier === 'tier_1'),
    },
    {
      key: 'tier_2',
      label: 'Medium Priority',
      variant: 'tier_2',
      items: items.filter(i => i.tier === 'tier_2'),
    },
    {
      key: 'low_priority',
      label: 'Low Priority',
      variant: 'low_priority',
      items: items.filter(i => i.tier === 'low_priority'),
    },
  ];

  const toggleGroup = (key: string) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <p className="text-lg">No digest items yet</p>
        <p className="mt-1 text-sm">Items will appear here after integrations sync</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map(group => {
        if (group.items.length === 0) return null;
        const isCollapsed = collapsed[group.key];

        return (
          <div key={group.key}>
            <button
              onClick={() => toggleGroup(group.key)}
              className="flex w-full items-center gap-2 py-2 text-left"
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              )}
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                {group.label}
              </h2>
              <Badge variant={group.variant as 'tier_1' | 'tier_2' | 'low_priority'}>{group.items.length}</Badge>
            </button>

            {!isCollapsed && (
              <div className="mt-2 space-y-3">
                {group.items.map(item => (
                  <DigestItemCard
                    key={item.id}
                    item={item}
                    onStatusChange={onStatusChange}
                    onRefreshScore={onRefreshScore}
                    onPromoteToNotion={onPromoteToNotion}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
