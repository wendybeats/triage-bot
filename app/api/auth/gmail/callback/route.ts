import { NextRequest, NextResponse } from 'next/server';
import { setCredentials } from '@/lib/gmail';
import { formatError } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    if (!code) {
      return NextResponse.json({ error: 'No code provided' }, { status: 400 });
    }

    const tokens = await setCredentials(code);

    // In production, store refresh_token securely
    // For MVP, display it so user can add to env vars
    return NextResponse.json({
      success: true,
      message: 'Gmail connected! Save this refresh token to your environment variables as GMAIL_REFRESH_TOKEN.',
      refresh_token: tokens.refresh_token,
    });
  } catch (error) {
    return NextResponse.json(formatError(error), { status: 500 });
  }
}
