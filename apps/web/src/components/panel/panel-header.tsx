import Link from 'next/link';
import { Logo } from '@/components/brand';
import type { CurrentUser } from '@/server/session';
import { UserMenu } from './user-menu';

export function PanelHeader({ user }: { user: CurrentUser }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
        <Logo className="text-base" />
        <nav className="text-sm text-muted-foreground">
          <Link href="/panel" className="transition-colors hover:text-foreground">
            Sunucularım
          </Link>
        </nav>
        <div className="ml-auto">
          <UserMenu name={user.name} image={user.image} />
        </div>
      </div>
    </header>
  );
}
