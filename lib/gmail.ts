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
  
  const query = 'from:shopee OR from:tokopedia OR from:traveloka newer_than:30d';
  
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
      const body = data.data.snippet || '';
      
      return { subject, from, body };
    })
  );

  return emails;
}
