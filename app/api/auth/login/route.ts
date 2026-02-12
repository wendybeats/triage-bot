import { NextRequest, NextResponse } from 'next/server';
import { formatError } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (password !== process.env.DIGEST_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set('digest-session', process.env.DIGEST_PASSWORD!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json(formatError(error), { status: 500 });
  }
}
