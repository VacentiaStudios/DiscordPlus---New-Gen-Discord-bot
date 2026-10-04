'use client';

import { Button } from '@/components/ui/button';

export default function PanelError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Bir şeyler ters gitti</h1>
      <p className="mt-3 text-muted-foreground">
        Sayfa yüklenirken bir hata oluştu. Discord veya sunucumuz geçici olarak yanıt vermiyor
        olabilir.
      </p>
      <Button className="mt-8" onClick={reset}>
        Tekrar dene
      </Button>
    </div>
  );
}
