import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { scoreRequest } from '@/lib/openai';
import { formatError, validateWebhookSecret } from '@/lib/utils';
import { ThreadMessage } from '@/types';

interface SlackDigestMessage {
  text: string;
  sender: string;
  timestamp: string;
  thread_ts?: string;
  channel: string;
  channel_name?: string;
  link?: string;
}

interface BatchResult {
  thread_id: string;
  status: 'created' | 'updated' | 'error';
  impact_score?: number;
  tier?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    if (!validateWebhookSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messages } = await request.json() as { messages: SlackDigestMessage[] };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 });
    }

    // Group messages by thread so we process threads together
    const threadGroups = new Map<string, SlackDigestMessage[]>();
    for (const msg of messages) {
      const threadId = msg.thread_ts || `slack-${msg.channel}-${msg.timestamp}`;
      const group = threadGroups.get(threadId) || [];
      group.push(msg);
      threadGroups.set(threadId, group);
    }

    const results: BatchResult[] = [];

    for (const [threadId, threadMessages] of threadGroups) {
      try {
        // Sort by timestamp
        threadMessages.sort((a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        const firstMsg = threadMessages[0];
        const channelName = firstMsg.channel_name || firstMsg.channel;

        // Check if thread already exists
        const { data: existing } = await supabaseAdmin
          .from('digest_items')
          .select('*')
          .eq('thread_id', threadId)
          .eq('source', 'slack')
          .single();

        if (existing) {
          // Append new messages to thread history
          const newEntries: ThreadMessage[] = threadMessages.map(m => ({
            text: m.text,
            sender: m.sender,
            timestamp: m.timestamp,
            link: m.link,
          }));

          const threadHistory = [...(existing.thread_history || []), ...newEntries];

          const scoring = await scoreRequest(
            existing.initial_message,
            threadHistory,
            existing.impact_score
          );

          const priorityHistory = [...(existing.priority_history || [])];
          if (scoring.impact_score !== existing.impact_score) {
            priorityHistory.push({
              score: scoring.impact_score,
              timestamp: new Date().toISOString(),
              reason: scoring.reasoning,
            });
          }

          const { error } = await supabaseAdmin
            .from('digest_items')
            .update({
              thread_history: threadHistory,
              current_summary: scoring.reasoning,
              tier: scoring.tier,
              impact_score: scoring.impact_score,
              okr_alignment: scoring.okr_alignment,
              effort: scoring.effort,
              ai_reasoning: scoring.reasoning,
              status_suggestion: scoring.status_suggestion,
              resolution_detected: scoring.resolution_detected,
              priority_history: priorityHistory,
              escalation_count: scoring.escalation_detected
                ? existing.escalation_count + 1
                : existing.escalation_count,
              last_updated: new Date().toISOString(),
            })
            .eq('id', existing.id);

          if (error) throw error;

          results.push({
            thread_id: threadId,
            status: 'updated',
            impact_score: scoring.impact_score,
            tier: scoring.tier,
          });
        } else {
          // New thread — first message is the initial message, rest is history
          const initialMessage = firstMsg.text;
          const threadHistory: ThreadMessage[] = threadMessages.slice(1).map(m => ({
            text: m.text,
            sender: m.sender,
            timestamp: m.timestamp,
            link: m.link,
          }));

          const scoring = await scoreRequest(initialMessage, threadHistory);

          const slackLink = firstMsg.link
            || `https://mxl.slack.com/archives/${firstMsg.channel}/p${firstMsg.timestamp.replace('.', '')}`;

          const { error } = await supabaseAdmin
            .from('digest_items')
            .insert({
              thread_id: threadId,
              source: 'slack',
              initial_message: `[#${channelName}] ${initialMessage}`,
              thread_history: threadHistory,
              current_summary: scoring.reasoning,
              sender: firstMsg.sender,
              link: slackLink,
              tier: scoring.tier,
              impact_score: scoring.impact_score,
              okr_alignment: scoring.okr_alignment,
              effort: scoring.effort,
              ai_reasoning: scoring.reasoning,
              status_suggestion: scoring.status_suggestion,
              resolution_detected: scoring.resolution_detected,
              priority_history: [{
                score: scoring.impact_score,
                timestamp: new Date().toISOString(),
                reason: 'Initial scoring',
              }],
              escalation_count: 0,
            });

          if (error) throw error;

          results.push({
            thread_id: threadId,
            status: 'created',
            impact_score: scoring.impact_score,
            tier: scoring.tier,
          });
        }
      } catch (error) {
        results.push({
          thread_id: threadId,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const created = results.filter(r => r.status === 'created').length;
    const updated = results.filter(r => r.status === 'updated').length;
    const errors = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      summary: { total: results.length, created, updated, errors },
      results,
    });
  } catch (error) {
    return NextResponse.json(formatError(error), { status: 500 });
  }
}
