import React from 'react';
import './globals.css';
import { Providers } from '../components/providers';
import { AppShell } from '../components/app-shell';

export const metadata = {
  title: 'OpenReach — Self-Hosted WhatsApp AI Automation',
  description: 'Free, open-source, self-hostable WhatsApp AI automation platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
