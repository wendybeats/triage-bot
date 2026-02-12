import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { scoreRequest } from '@/lib/openai';
import { formatError, validateSession, validateWebhookSecret } from '@/lib/utils';
import { CreateDigestRequest } from '@/types';

export async function POST(request: NextRequest) {
  try {
    // Accept both session auth and webhook auth
    if (!validateSession(request) && !validateWebhookSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateDigestRequest = await request.json();
    const { source, thread_id, message, sender, link, timestamp } = body;

    if (!source || !message || !sender) {
      return NextResponse.json({ error: 'Missing required fields: source, message, sender' }, { status: 400 });
    }

    // Check if thread exists
    if (thread_id) {
      const { data: existing } = await supabaseAdmin
        .from('digest_items')
        .select('*')
        .eq('thread_id', thread_id)
        .eq('source', source)
        .single();

      if (existing) {
        // Update existing thread
        const threadHistory = [...(existing.thread_history || []), {
          text: message,
          sender,
          timestamp: timestamp || new Date().toISOString(),
          link,
        }];

        // Re-score with full thread context
        const scoring = await scoreRequest(
          existing.initial_message,
          threadHistory,
          existing.impact_score
        );

        // Track priority history
        const priorityHistory = [...(existing.priority_history || [])];
        if (scoring.impact_score !== existing.impact_score) {
          priorityHistory.push({
            score: scoring.impact_score,
            timestamp: new Date().toISOString(),
            reason: scoring.reasoning,
          });
        }

        const escalationCount = scoring.escalation_detected
          ? existing.escalation_count + 1
          : existing.escalation_count;

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
            escalation_count: escalationCount,
            last_updated: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return NextResponse.json(data);
      }
    }

    // Create new item - score it first
    const scoring = await scoreRequest(message, []);

    const { data, error } = await supabaseAdmin
      .from('digest_items')
      .insert({
        thread_id: thread_id || null,
        source,
        initial_message: message,
        thread_history: [],
        current_summary: scoring.reasoning,
        sender,
        link: link || null,
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
