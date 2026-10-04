import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function GuildPageNotFound() {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <p className="text-sm font-medium text-primary">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Kayıt bulunamadı</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Aradığınız sayfa veya vaka bu sunucuda bulunmuyor.
      </p>
      <Button asChild variant="outline" className="mt-8">
        <Link href="../">Geri dön</Link>
      </Button>
    </div>
  );
}
