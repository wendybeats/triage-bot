import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { formatError, validateSession } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    if (!validateSession(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status');
    const tier = searchParams.get('tier');
    const source = searchParams.get('source');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabaseAdmin
      .from('digest_items')
      .select('*')
      .is('archived_at', null)
      .order('impact_score', { ascending: false })
      .order('last_updated', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);
    if (tier) query = query.eq('tier', tier);
    if (source) query = query.eq('source', source);
    if (search) query = query.or(`initial_message.ilike.%${search}%,sender.ilike.%${search}%,ai_reasoning.ilike.%${search}%`);

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    return NextResponse.json(formatError(error), { status: 500 });
  }
}
