import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatError(error: unknown, details?: unknown) {
  return {
    error: error instanceof Error ? error.message : 'Unknown error',
    details,
    timestamp: new Date().toISOString(),
  };
}

export function validateCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) return false;
  return authHeader === `Bearer ${cronSecret}`;
}

export function validateWebhookSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const webhookSecret = process.env.MAKE_WEBHOOK_SECRET;

  if (!webhookSecret) return false;
  return authHeader === `Bearer ${webhookSecret}`;
}

export function validateSession(request: Request): boolean {
  const cookie = request.headers.get('cookie') || '';
  const sessionMatch = cookie.match(/digest-session=([^;]+)/);
  if (!sessionMatch) return false;

  // Simple password-based session validation
  return sessionMatch[1] === process.env.DIGEST_PASSWORD;
}
