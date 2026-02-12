import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { scoreRequest } from '@/lib/openai';
import { formatError, validateWebhookSecret } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    if (!validateWebhookSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text, sender, timestamp, thread_ts, channel, link } = await request.json();

    if (!text || !sender) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const threadId = thread_ts || `slack-${timestamp}`;

    // Check if thread exists
    const { data: existing } = await supabaseAdmin
      .from('digest_items')
      .select('*')
      .eq('thread_id', threadId)
      .eq('source', 'slack')
      .single();

    if (existing) {
      const threadHistory = [...(existing.thread_history || []), {
        text,
        sender,
        timestamp: timestamp || new Date().toISOString(),
        link,
      }];

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

      const { data, error } = await supabaseAdmin
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
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }

    // New message
    const scoring = await scoreRequest(text, []);
    const slackLink = link || `https://slack.com/app_redirect?channel=${channel}`;

    const { data, error } = await supabaseAdmin
      .from('digest_items')
      .insert({
        thread_id: threadId,
        source: 'slack',
        initial_message: text,
        thread_history: [],
        current_summary: scoring.reasoning,
        sender,
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
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json(formatError(error), { status: 500 });
  }
}
