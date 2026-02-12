import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { formatError, validateCronSecret } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    if (!validateCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
      .from('digest_items')
      .update({ archived_at: new Date().toISOString() })
      .lt('created_at', fourteenDaysAgo)
      .in('status', ['done', 'deferred'])
      .is('archived_at', null)
      .select('id');

    if (error) throw error;

    return NextResponse.json({
      message: 'Auto-archive completed',
      archived_count: data?.length || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(formatError(error), { status: 500 });
  }
}

// Also support GET for Vercel Cron
export async function GET(request: NextRequest) {
  return POST(request);
}
