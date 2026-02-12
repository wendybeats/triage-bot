import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createNotionTask } from '@/lib/notion';
import { formatError, validateSession } from '@/lib/utils';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!validateSession(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the digest item
    const { data: item, error: fetchError } = await supabaseAdmin
      .from('digest_items')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Create Notion task
    const description = [
      item.current_summary || item.initial_message,
      '',
      `Source: ${item.source}`,
      `Sender: ${item.sender}`,
      `Impact: ${item.impact_score}/10`,
      `Effort: ${item.effort}`,
      `OKR: ${item.okr_alignment}`,
      '',
      `AI Reasoning: ${item.ai_reasoning}`,
    ].join('\n');

    const notionPageId = await createNotionTask(
      `[${item.tier.toUpperCase()}] ${item.initial_message.substring(0, 100)}`,
      description,
      item.tier,
      item.link || undefined
    );

    // Mark as done
    const { data, error } = await supabaseAdmin
      .from('digest_items')
      .update({
        status: 'done',
        last_updated: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      ...data,
      notion_page_id: notionPageId,
    });
  } catch (error) {
    return NextResponse.json(formatError(error), { status: 500 });
  }
}
