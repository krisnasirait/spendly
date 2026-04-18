import { google, Auth } from 'googleapis';

export function createGmailClient(accessToken: string): Auth.OAuth2Client {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL
  );
  oauth2Client.setCredentials({ access_token: accessToken });
  return oauth2Client;
}

export async function fetchTransactionEmails(auth: Auth.OAuth2Client) {
  const gmail = google.gmail({ version: 'v1', auth });
  
  const query = 'from:shopee OR from:tokopedia OR from:traveloka OR from:bca OR from:ayo OR from:jago newer_than:30d';
  
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 50,
  });

  const messages = response.data.messages || [];
  
  const emails = await Promise.all(
    messages.map(async (msg) => {
      const data = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'full',
      });
      
      const headers = data.data.payload?.headers || [];
      const subject = headers.find((h) => h.name === 'Subject')?.value || '';
      const from = headers.find((h) => h.name === 'From')?.value || '';
      const dateStr = headers.find((h) => h.name === 'Date')?.value || '';

      function decodeBody(payload: { body?: { data?: string }; parts?: unknown[] }): string {
        if (payload.body?.data) {
          return Buffer.from(payload.body.data, 'base64').toString('utf-8');
        }
        if (payload.parts) {
          for (const part of payload.parts as { body?: { data?: string }; parts?: unknown[]; mimeType?: string }[]) {
            if (part.mimeType === 'text/plain') {
              const decoded = decodeBody(part);
              if (decoded) return decoded;
            }
          }
          for (const part of payload.parts as { body?: { data?: string }; parts?: unknown[]; mimeType?: string }[]) {
            if (part.mimeType === 'text/html') {
              const decoded = decodeBody(part);
              if (decoded) return decoded;
            }
          }
        }
        return '';
      }

      function htmlToText(html: string): string {
        return html
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n')
          .replace(/<\/div>/gi, '\n')
          .replace(/<\/tr>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      }

      const rawBody = decodeBody(data.data.payload as { body?: { data?: string }; parts?: unknown[] }) || data.data.snippet || '';
      const body = htmlToText(rawBody);
      const date = new Date(dateStr);

      return { id: msg.id!, subject, from, date, snippet: body };
    })
  );

  return emails;
}
