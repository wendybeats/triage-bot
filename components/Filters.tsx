'use client';

import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { useState } from 'react';

interface FiltersProps {
  onFilterChange: (filters: {
    status?: string;
    tier?: string;
    source?: string;
    search?: string;
  }) => void;
}

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'new', label: 'New' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
  { value: 'deferred', label: 'Deferred' },
];

const tierOptions = [
  { value: '', label: 'All Tiers' },
  { value: 'tier_1', label: 'High Priority' },
  { value: 'tier_2', label: 'Medium' },
  { value: 'low_priority', label: 'Low' },
];

const sourceOptions = [
  { value: '', label: 'All Sources' },
  { value: 'slack', label: 'Slack' },
  { value: 'gmail', label: 'Gmail' },
  { value: 'figma', label: 'Figma' },
  { value: 'notion', label: 'Notion' },
  { value: 'voice', label: 'Voice' },
];

export function Filters({ onFilterChange }: FiltersProps) {
  const [status, setStatus] = useState('');
  const [tier, setTier] = useState('');
  const [source, setSource] = useState('');
  const [search, setSearch] = useState('');

  const handleChange = (field: string, value: string) => {
    const newFilters = { status, tier, source, search };
    switch (field) {
      case 'status': setStatus(value); newFilters.status = value; break;
      case 'tier': setTier(value); newFilters.tier = value; break;
      case 'source': setSource(value); newFilters.source = value; break;
      case 'search': setSearch(value); newFilters.search = value; break;
    }
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    setStatus('');
    setTier('');
    setSource('');
    setSearch('');
    onFilterChange({});
  };

  const hasActiveFilters = status || tier || source || search;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={status}
          onChange={(e) => handleChange('status', e.target.value)}
          className="rounded-claude border border-dark-border bg-dark-card px-3 py-2 text-sm text-dark-text focus:border-primary-400 focus:ring-primary-400"
        >
          {statusOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <select
          value={tier}
          onChange={(e) => handleChange('tier', e.target.value)}
          className="rounded-claude border border-dark-border bg-dark-card px-3 py-2 text-sm text-dark-text focus:border-primary-400 focus:ring-primary-400"
        >
          {tierOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <select
          value={source}
          onChange={(e) => handleChange('source', e.target.value)}
          className="rounded-claude border border-dark-border bg-dark-card px-3 py-2 text-sm text-dark-text focus:border-primary-400 focus:ring-primary-400"
        >
          {sourceOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search messages, senders..."
          value={search}
          onChange={(e) => handleChange('search', e.target.value)}
          className="w-full rounded-claude border border-dark-border bg-dark-card py-2 pl-10 pr-4 text-sm text-dark-text placeholder:text-gray-500 focus:border-primary-400 focus:ring-primary-400"
        />
      </div>
    </div>
  );
}
