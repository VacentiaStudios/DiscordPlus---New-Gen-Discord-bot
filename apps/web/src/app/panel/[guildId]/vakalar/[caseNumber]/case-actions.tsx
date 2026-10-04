'use client';

import { LoaderCircle, Save, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { deleteCaseAction, updateCaseReasonAction } from '@/server/actions/cases';

export function CaseReasonForm({
  guildId,
  caseNumber,
  reason,
}: {
  guildId: string;
  caseNumber: number;
  reason: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(reason ?? '');
  const [pending, startTransition] = useTransition();
  const dirty = value.trim() !== (reason ?? '');

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await updateCaseReasonAction(guildId, caseNumber, value);
          if (result.ok) {
            toast.success('Sebep güncellendi.');
            router.refresh();
          } else {
            toast.error(result.error);
          }
        });
      }}
    >
      <label htmlFor="reason" className="text-sm font-medium">
        Sebep
      </label>
      <Textarea
        id="reason"
        value={value}
        maxLength={500}
        rows={3}
        placeholder="Sebep belirtilmedi"
        onChange={(event) => setValue(event.target.value)}
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{value.length}/500</p>
        <Button type="submit" size="sm" disabled={!dirty || pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : <Save />}
          Sebebi kaydet
        </Button>
      </div>
    </form>
  );
}

export function DeleteCaseButton({ guildId, caseNumber }: { guildId: string; caseNumber: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
          Vakayı sil
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Vaka #{caseNumber} silinsin mi?</AlertDialogTitle>
          <AlertDialogDescription>
            Silinen vaka geçmişte görünmez; silinen uyarılar eşik hesabına katılmaz. Bu işlem
            uygulanmış cezayı geri almaz.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Vazgeç</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              startTransition(async () => {
                const result = await deleteCaseAction(guildId, caseNumber);
                if (result.ok) {
                  toast.success(`Vaka #${caseNumber} silindi.`);
                  router.push(`/panel/${guildId}/vakalar`);
                } else {
                  toast.error(result.error);
                }
              })
            }
          >
            Sil
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
