import type { ReactNode } from 'react';
import { Providers } from '@/components/providers/Providers';
import './globals.css';

export const metadata = {
  title: 'Spendly — Know Where Your Money Goes',
  description: 'AI-powered spending tracker that reads your emails to give you smart insights about your finances.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}