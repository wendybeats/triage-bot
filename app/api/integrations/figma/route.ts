import { NextRequest, NextResponse } from 'next/server';
import { fetchRecentComments, getFigmaCommentLink } from '@/lib/figma';
import { supabaseAdmin } from '@/lib/supabase';
import { scoreRequest } from '@/lib/openai';
import { formatError, validateCronSecret, validateSession } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    if (!validateCronSecret(request) && !validateSession(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const comments = await fetchRecentComments();
    const results = [];

    for (const comment of comments) {
      try {
        const threadId = comment.id;
        const link = getFigmaCommentLink(comment.file_key, comment.id);

        // Check if already tracked
        const { data: existing } = await supabaseAdmin
          .from('digest_items')
          .select('*')
          .eq('thread_id', threadId)
          .eq('source', 'figma')
          .single();

        if (existing) {
          // Update thread
          const threadHistory = [...(existing.thread_history || []), {
            text: comment.message,
            sender: comment.user.handle,
            timestamp: comment.created_at,
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

          const { data } = await supabaseAdmin
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

          results.push({ action: 'updated', id: data?.id });
        } else {
          const scoring = await scoreRequest(comment.message, []);

          const { data } = await supabaseAdmin
            .from('digest_items')
            .insert({
              thread_id: threadId,
              source: 'figma',
              initial_message: comment.message,
              thread_history: [],
              current_summary: scoring.reasoning,
              sender: comment.user.handle,
              link,
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

          results.push({ action: 'created', id: data?.id });
        }
      } catch (err) {
        console.error(`Failed to process Figma comment ${comment.id}:`, err);
        results.push({ action: 'error', commentId: comment.id, error: String(err) });
      }
    }

    return NextResponse.json({ processed: results.length, results });
  } catch (error) {
    return NextResponse.json(formatError(error), { status: 500 });
  }
}
