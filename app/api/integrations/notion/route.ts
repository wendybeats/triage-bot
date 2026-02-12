import { NextRequest, NextResponse } from 'next/server';
import { fetchRecentTasks } from '@/lib/notion';
import { supabaseAdmin } from '@/lib/supabase';
import { scoreRequest } from '@/lib/openai';
import { formatError, validateCronSecret, validateSession } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    if (!validateCronSecret(request) && !validateSession(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tasks = await fetchRecentTasks();
    const results = [];

    for (const task of tasks) {
      try {
        const threadId = task.id;

        const { data: existing } = await supabaseAdmin
          .from('digest_items')
          .select('*')
          .eq('thread_id', threadId)
          .eq('source', 'notion')
          .single();

        if (existing) {
          const threadHistory = [...(existing.thread_history || []), {
            text: `Status: ${task.status} - ${task.title}`,
            sender: task.assignee,
            timestamp: task.last_edited,
            link: task.url,
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
          const message = `[Notion Task] ${task.title} (Status: ${task.status})`;
          const scoring = await scoreRequest(message, []);

          const { data } = await supabaseAdmin
            .from('digest_items')
            .insert({
              thread_id: threadId,
              source: 'notion',
              initial_message: message,
              thread_history: [],
              current_summary: scoring.reasoning,
              sender: task.assignee,
              link: task.url,
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
        console.error(`Failed to process Notion task ${task.id}:`, err);
        results.push({ action: 'error', taskId: task.id, error: String(err) });
      }
    }

    return NextResponse.json({ processed: results.length, results });
  } catch (error) {
    return NextResponse.json(formatError(error), { status: 500 });
  }
}
