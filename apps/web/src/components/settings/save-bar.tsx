'use client';

import { LoaderCircle, RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Sticky bar that appears when a settings form has unsaved changes. */
export function SaveBar({
  dirty,
  pending,
  onSave,
  onReset,
}: {
  dirty: boolean;
  pending: boolean;
  onSave: () => void;
  onReset: () => void;
}) {
  return (
    <div
      className={cn(
        'sticky bottom-4 z-30 transition-all duration-200',
        dirty || pending
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-4 opacity-0',
      )}
      aria-hidden={!dirty && !pending}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-popover/95 px-4 py-3 shadow-lg backdrop-blur">
        <p className="text-sm">Kaydedilmemiş değişiklikleriniz var.</p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            disabled={pending}
            tabIndex={dirty ? 0 : -1}
          >
            <RotateCcw />
            Geri al
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onSave}
            disabled={pending}
            tabIndex={dirty ? 0 : -1}
          >
            {pending ? <LoaderCircle className="animate-spin" /> : <Save />}
            Kaydet
          </Button>
        </div>
      </div>
    </div>
  );
}
