import type { Metadata } from 'next';
import type * as React from 'react';
import { PanelHeader } from '@/components/panel/panel-header';
import { getCurrentUser } from '@/server/session';

// Every panel page depends on the signed-in user.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { default: 'Panel', template: '%s · DiscordPlus Paneli' },
  robots: { index: false },
};

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  // Pages enforce sign-in themselves so that the login redirect can come back to the
  // exact page that was requested.
  const user = await getCurrentUser();
  return (
    <div className="min-h-dvh">
      {user ? <PanelHeader user={user} /> : null}
      {children}
    </div>
  );
}
