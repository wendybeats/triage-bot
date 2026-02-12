'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowLeft, Mail, Figma, FileText } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [gmailStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');

  useEffect(() => {
    fetch('/api/auth/check').then(res => {
      if (res.status === 401) router.push('/login');
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-dark-bg">
      <header className="border-b border-dark-border bg-dark-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold text-dark-text">Settings</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {/* OKRs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current OKRs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg bg-dark-bg p-3">
              <h3 className="text-sm font-medium text-primary-400">1. Increase Subscriptions</h3>
              <p className="mt-1 text-xs text-gray-500">
                Actions that drive users to upgrade (paywalls, feature gates, pricing pages)
              </p>
            </div>
            <div className="rounded-lg bg-dark-bg p-3">
              <h3 className="text-sm font-medium text-primary-400">2. Boost Retention</h3>
              <p className="mt-1 text-xs text-gray-500">
                Features that keep users engaged (core workflows, habit formation, value delivery)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Priority People */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Priority People</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-red-400">Tier 1</h3>
              <p className="mt-1 text-sm text-gray-400">Matt Taretsky, Matt Robinson, Kieran, Dan, Marcus</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-yellow-400">Tier 2</h3>
              <p className="mt-1 text-sm text-gray-400">Alex, T, Karina</p>
            </div>
          </CardContent>
        </Card>

        {/* Integrations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Integrations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-dark-bg p-3">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-red-400" />
                <div>
                  <h3 className="text-sm font-medium">Gmail</h3>
                  <p className="text-xs text-gray-500">Pull emails from last 24hrs</p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  window.open('/api/auth/gmail/authorize', '_blank');
                }}
              >
                {gmailStatus === 'connected' ? 'Re-connect' : 'Connect'}
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-dark-bg p-3">
              <div className="flex items-center gap-3">
                <Figma className="h-5 w-5 text-pink-400" />
                <div>
                  <h3 className="text-sm font-medium">Figma</h3>
                  <p className="text-xs text-gray-500">3 files monitored</p>
                </div>
              </div>
              <span className="text-xs text-green-400">Connected</span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-dark-bg p-3">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-gray-300" />
                <div>
                  <h3 className="text-sm font-medium">Notion</h3>
                  <p className="text-xs text-gray-500">Task database synced</p>
                </div>
              </div>
              <span className="text-xs text-green-400">Connected</span>
            </div>
          </CardContent>
        </Card>

        {/* Cron Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg bg-dark-bg p-3">
              <h3 className="text-sm font-medium">Daily Digest</h3>
              <p className="text-xs text-gray-500">Runs daily at 3:00 PM GMT+4 (11:00 AM UTC)</p>
            </div>
            <div className="rounded-lg bg-dark-bg p-3">
              <h3 className="text-sm font-medium">Auto-Archive</h3>
              <p className="text-xs text-gray-500">Archives done/deferred items after 14 days, runs at midnight UTC</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                const res = await fetch('/api/cron/daily-digest', {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${prompt('Enter CRON_SECRET:')}` },
                });
                const data = await res.json();
                alert(JSON.stringify(data, null, 2));
              }}
            >
              Trigger Digest Manually
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
