import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

export function getAuthUrl(): string {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    prompt: 'consent',
  });
}

export async function setCredentials(code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  return tokens;
}

export function setRefreshToken(refreshToken: string) {
  oauth2Client.setCredentials({ refresh_token: refreshToken });
}

export interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  snippet: string;
  date: string;
  body: string;
}

export async function fetchRecentEmails(): Promise<GmailMessage[]> {
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  if (!refreshToken) throw new Error('Gmail refresh token not configured');

  setRefreshToken(refreshToken);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Search for emails from the last 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const afterDate = Math.floor(oneDayAgo.getTime() / 1000);

  const keywords = ['design', 'UX', 'research', 'Marcus', 'Gary'];
  const keywordQuery = keywords.map(k => `"${k}"`).join(' OR ');
  const query = `(to:me OR cc:me OR ${keywordQuery}) after:${afterDate}`;

  const response = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 50,
  });

  const messages: GmailMessage[] = [];

  if (response.data.messages) {
    for (const msg of response.data.messages) {
      try {
        const full = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
          format: 'full',
        });

        const headers = full.data.payload?.headers || [];
        const subject = headers.find(h => h.name === 'Subject')?.value || '(No subject)';
        const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
        const date = headers.find(h => h.name === 'Date')?.value || new Date().toISOString();

        // Extract body text
        let body = '';
        const parts = full.data.payload?.parts;
        if (parts) {
          const textPart = parts.find(p => p.mimeType === 'text/plain');
          if (textPart?.body?.data) {
            body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
          }
        } else if (full.data.payload?.body?.data) {
          body = Buffer.from(full.data.payload.body.data, 'base64').toString('utf-8');
        }

        messages.push({
          id: msg.id!,
          threadId: full.data.threadId || msg.id!,
          subject,
          from,
          snippet: full.data.snippet || '',
          date,
          body: body.substring(0, 2000), // Limit body length
        });
      } catch (err) {
        console.error(`Failed to fetch email ${msg.id}:`, err);
      }
    }
  }

  return messages;
}
