'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DigestItem } from '@/types';
import { DigestList } from '@/components/DigestList';
import { Filters } from '@/components/Filters';
import { VoiceInput } from '@/components/VoiceInput';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { LogOut, RefreshCw, Mic, Settings } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [items, setItems] = useState<DigestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVoice, setShowVoice] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const fetchItems = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });

      const res = await fetch(`/api/digest/list?${params.toString()}`);
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (err) {
      console.error('Failed to fetch items:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, router]);

  useEffect(() => {
    // Auth check
    fetch('/api/auth/check').then(res => {
      if (res.status === 401) router.push('/login');
      else fetchItems();
    });
  }, [fetchItems, router]);

  // Supabase realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('digest-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'digest_items' },
        () => {
          // Refresh on any change
          fetchItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchItems]);

  const handleStatusChange = async (id: string, status: string) => {
    const res = await fetch(`/api/digest/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) fetchItems();
  };

  const handleRefreshScore = async (id: string) => {
    const res = await fetch(`/api/digest/${id}/refresh-score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (res.ok) fetchItems();
  };

  const handlePromoteToNotion = async (id: string) => {
    const res = await fetch(`/api/digest/${id}/promote-to-notion`, {
      method: 'POST',
    });
    if (res.ok) fetchItems();
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleFilterChange = (newFilters: Record<string, string>) => {
    setFilters(newFilters);
  };

  useEffect(() => {
    if (!loading) fetchItems();
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-dark-border bg-dark-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-claude bg-primary-500">
              <span className="text-sm font-bold text-white">T</span>
            </div>
            <h1 className="text-lg font-semibold text-dark-text">Triage Digest</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowVoice(!showVoice)}
              title="Voice input"
            >
              <Mic className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchItems}
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/settings')}
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Voice Input */}
        {showVoice && (
          <div className="mb-6 rounded-claude border border-dark-border bg-dark-card p-6">
            <VoiceInput onTranscribed={() => { fetchItems(); setShowVoice(false); }} />
          </div>
        )}

        {/* Filters */}
        <div className="mb-6">
          <Filters onFilterChange={handleFilterChange} />
        </div>

        {/* Summary Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total', value: items.length, color: 'text-primary-400' },
            { label: 'High Priority', value: items.filter(i => i.tier === 'tier_1').length, color: 'text-red-400' },
            { label: 'In Progress', value: items.filter(i => i.status === 'in_progress').length, color: 'text-yellow-400' },
            { label: 'New', value: items.filter(i => i.status === 'new').length, color: 'text-blue-400' },
          ].map(stat => (
            <div
              key={stat.label}
              className="rounded-claude border border-dark-border bg-dark-card p-3 text-center"
            >
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Digest List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-6 w-6 animate-spin text-primary-400" />
          </div>
        ) : (
          <DigestList
            items={items}
            onStatusChange={handleStatusChange}
            onRefreshScore={handleRefreshScore}
            onPromoteToNotion={handlePromoteToNotion}
          />
        )}
      </main>
    </div>
  );
}
