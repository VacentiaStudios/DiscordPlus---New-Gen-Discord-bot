import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-medium text-primary">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sayfa bulunamadı</h1>
      <p className="mt-3 text-muted-foreground">Aradığınız sayfa taşınmış veya hiç var olmamış.</p>
      <Button asChild className="mt-8">
        <Link href="/">Ana sayfaya dön</Link>
      </Button>
    </div>
  );
}
