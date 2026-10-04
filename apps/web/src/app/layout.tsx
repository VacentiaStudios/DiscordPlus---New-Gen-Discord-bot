import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import type { Metadata, Viewport } from 'next';
import type * as React from 'react';
import { Toaster } from '@/components/ui/sonner';
import '@/lib/zod';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'DiscordPlus — Yeni nesil Discord moderasyonu',
    template: '%s · DiscordPlus',
  },
  description:
    'Web panelinden yönetilen, Türkçe, yeni nesil Discord moderasyon botu: vaka sistemi, AutoMod ve gelişmiş loglama.',
};

export const viewport: Viewport = {
  themeColor: '#16171d',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
