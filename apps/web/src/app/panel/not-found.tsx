import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function PanelNotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <p className="text-sm font-medium text-primary">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sunucu bulunamadı</h1>
      <p className="mt-3 text-muted-foreground">
        Bu sunucu yok ya da onu yönetme yetkiniz bulunmuyor. Paneli yalnızca sahibi olduğunuz veya
        Yönetici ya da Sunucuyu Yönet yetkiniz olan sunucular için kullanabilirsiniz.
      </p>
      <Button asChild className="mt-8">
        <Link href="/panel">Sunucularıma dön</Link>
      </Button>
    </div>
  );
}
