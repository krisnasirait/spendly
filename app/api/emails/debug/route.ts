import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { google } from 'googleapis';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sender = searchParams.get('sender') || 'bca@bca.co.id';

  const accessToken = (session as unknown as { accessToken: string }).accessToken;
  if (!accessToken) {
    return NextResponse.json({ error: 'No access token' }, { status: 400 });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL
  );
  oauth2Client.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const query = `from:${sender} newer_than:30d`;

  const response = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 5,
  });

  const messages = response.data.messages || [];

  if (messages.length === 0) {
    return NextResponse.json({ 
      sender,
      emails: [],
      message: `No emails found from ${sender}` 
    });
  }

  const emails = await Promise.all(
    messages.map(async (msg) => {
      const data = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'full',
      });

      const payload = data.data.payload;
      const headers = payload?.headers || [];
      
      const subject = headers.find((h) => h.name === 'Subject')?.value || '';
      const from = headers.find((h) => h.name === 'From')?.value || '';
      const date = headers.find((h) => h.name === 'Date')?.value || '';

      let body = '';
      if (payload?.body?.data) {
        body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      } else if (payload?.parts) {
        for (const part of payload.parts) {
          if (part.body?.data) {
            body = Buffer.from(part.body.data, 'base64').toString('utf-8');
            break;
          }
        }
      }

      const snippet = data.data.snippet || '';

      return {
        id: msg.id,
        subject,
        from,
        date,
        body: body || snippet,
        snippet,
      };
    })
  );

  return NextResponse.json({
    sender,
    count: emails.length,
    emails,
  });
}