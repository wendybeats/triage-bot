import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/utils';

export async function GET(request: NextRequest) {
  if (!validateSession(request)) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true });
}
