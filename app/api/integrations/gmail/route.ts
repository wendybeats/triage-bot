import { NextRequest, NextResponse } from 'next/server';
import { fetchRecentEmails } from '@/lib/gmail';
import { supabaseAdmin } from '@/lib/supabase';
import { scoreRequest } from '@/lib/openai';
import { formatError, validateCronSecret, validateSession } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    if (!validateCronSecret(request) && !validateSession(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const emails = await fetchRecentEmails();
    const results = [];

    for (const email of emails) {
      try {
        const threadId = email.threadId;

        // Check if thread exists
        const { data: existing } = await supabaseAdmin
          .from('digest_items')
          .select('*')
          .eq('thread_id', threadId)
          .eq('source', 'gmail')
          .single();

        if (existing) {
          // Update thread
          const threadHistory = [...(existing.thread_history || []), {
            text: `${email.subject}: ${email.snippet}`,
            sender: email.from,
            timestamp: email.date,
            link: `https://mail.google.com/mail/u/0/#inbox/${email.id}`,
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
          // Create new item
          const message = `${email.subject}\n\n${email.body || email.snippet}`;
          const scoring = await scoreRequest(message, []);

          const { data } = await supabaseAdmin
            .from('digest_items')
            .insert({
              thread_id: threadId,
              source: 'gmail',
              initial_message: message,
              thread_history: [],
              current_summary: scoring.reasoning,
              sender: email.from,
              link: `https://mail.google.com/mail/u/0/#inbox/${email.id}`,
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
        console.error(`Failed to process email ${email.id}:`, err);
        results.push({ action: 'error', emailId: email.id, error: String(err) });
      }
    }

    return NextResponse.json({ processed: results.length, results });
  } catch (error) {
    return NextResponse.json(formatError(error), { status: 500 });
  }
}
