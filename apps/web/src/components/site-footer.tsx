import { Logo } from '@/components/brand';

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <Logo className="text-base text-foreground" />
        <p>© {new Date().getFullYear()} Vacentia Studios. Discord ile bağlantılı değildir.</p>
      </div>
    </footer>
  );
}
