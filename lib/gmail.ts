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
  
  const query = 'from:shopee OR from:tokopedia OR from:traveloka OR from:bca newer_than:30d';
  
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
            if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
              const decoded = decodeBody(part);
              if (decoded) return decoded;
            }
          }
          for (const part of payload.parts as { body?: { data?: string }; parts?: unknown[] }[]) {
            const decoded = decodeBody(part);
            if (decoded) return decoded;
          }
        }
        return '';
      }

      const body = decodeBody(data.data.payload!) || data.data.snippet || '';
      const date = new Date(dateStr);

      return { id: msg.id!, subject, from, date, snippet: body };
    })
  );

  return emails;
}
