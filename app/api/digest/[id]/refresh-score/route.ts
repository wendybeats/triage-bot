import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { scoreRequest } from '@/lib/openai';
import { formatError, validateSession } from '@/lib/utils';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!validateSession(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const additionalContext = body.additional_context || '';

    // Fetch current item
    const { data: item, error: fetchError } = await supabaseAdmin
      .from('digest_items')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Append additional context to thread if provided
    const threadHistory = [...(item.thread_history || [])];
    if (additionalContext) {
      threadHistory.push({
        text: additionalContext,
        sender: 'Manual Context',
        timestamp: new Date().toISOString(),
      });
    }

    // Re-score
    const scoring = await scoreRequest(
      item.initial_message,
      threadHistory,
      item.impact_score
    );

    // Track priority changes
    const priorityHistory = [...(item.priority_history || [])];
    if (scoring.impact_score !== item.impact_score) {
      priorityHistory.push({
        score: scoring.impact_score,
        timestamp: new Date().toISOString(),
        reason: `Re-scored: ${scoring.reasoning}`,
      });
    }

    const escalationCount = scoring.escalation_detected
      ? item.escalation_count + 1
      : item.escalation_count;

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
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(formatError(error), { status: 500 });
  }
}
