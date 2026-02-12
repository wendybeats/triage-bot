import { NextRequest, NextResponse } from 'next/server';
import { formatError, validateCronSecret } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    if (!validateCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const baseUrl = request.nextUrl.origin;
    const headers = {
      'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      'Content-Type': 'application/json',
    };

    const results = {
      gmail: null as unknown,
      figma: null as unknown,
      notion: null as unknown,
    };

    // Run integrations in parallel
    const [gmailRes, figmaRes, notionRes] = await Promise.allSettled([
      fetch(`${baseUrl}/api/integrations/gmail`, { method: 'POST', headers }),
      fetch(`${baseUrl}/api/integrations/figma`, { method: 'POST', headers }),
      fetch(`${baseUrl}/api/integrations/notion`, { method: 'POST', headers }),
    ]);

    if (gmailRes.status === 'fulfilled') {
      results.gmail = await gmailRes.value.json();
    } else {
      results.gmail = { error: gmailRes.reason?.message || 'Failed' };
      console.error('Gmail integration failed:', gmailRes.reason);
    }

    if (figmaRes.status === 'fulfilled') {
      results.figma = await figmaRes.value.json();
    } else {
      results.figma = { error: figmaRes.reason?.message || 'Failed' };
      console.error('Figma integration failed:', figmaRes.reason);
    }

    if (notionRes.status === 'fulfilled') {
      results.notion = await notionRes.value.json();
    } else {
      results.notion = { error: notionRes.reason?.message || 'Failed' };
      console.error('Notion integration failed:', notionRes.reason);
    }

    return NextResponse.json({
      message: 'Daily digest completed',
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    return NextResponse.json(formatError(error), { status: 500 });
  }
}

// Also support GET for Vercel Cron
export async function GET(request: NextRequest) {
  return POST(request);
}
