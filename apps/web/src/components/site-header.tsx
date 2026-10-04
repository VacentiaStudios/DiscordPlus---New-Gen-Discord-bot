import Link from 'next/link';
import { DiscordIcon, Logo } from '@/components/brand';
import { Button } from '@/components/ui/button';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/70 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Logo />
        <nav className="hidden items-center gap-5 text-sm text-muted-foreground md:flex">
          <Link href="/#ozellikler" className="transition-colors hover:text-foreground">
            Özellikler
          </Link>
          <Link href="/#nasil-calisir" className="transition-colors hover:text-foreground">
            Nasıl çalışır?
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/panel">Panel</Link>
          </Button>
          <Button asChild size="sm">
            <a href="/davet">
              <DiscordIcon className="size-4" />
              Discord&apos;a Ekle
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
