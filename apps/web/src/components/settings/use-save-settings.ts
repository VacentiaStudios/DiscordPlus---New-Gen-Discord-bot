'use client';

import '@/lib/zod';
import { settingsSchemas, type SectionSettings, type SettingsSection } from '@discordplus/shared';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { saveSettings, type SettingsIssue } from '@/server/actions/settings';

export type IssueMap = Record<string, string>;

export function toIssueMap(issues: readonly SettingsIssue[]): IssueMap {
  const map: IssueMap = {};
  for (const issue of issues) map[issue.path] ??= issue.message;
  return map;
}

/** Brings the first field marked invalid into view once the errors have rendered. */
function revealFirstInvalid(): void {
  requestAnimationFrame(() => {
    const field = document.querySelector<HTMLElement>('[aria-invalid="true"]');
    field?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    field?.focus({ preventScroll: true });
  });
}

/**
 * Validates a settings section with the shared schema in the browser, then saves
 * it through the server action (which validates again) and refreshes the page.
 */
export function useSaveSettings<S extends SettingsSection>(guildId: string, section: S) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [issues, setIssues] = useState<IssueMap>({});

  function save(value: SectionSettings<S>, extraIssues: IssueMap = {}): void {
    const parsed = settingsSchemas[section].safeParse(value);
    // Form-specific messages (e.g. an unparsable duration) are more precise than the
    // schema's, so they win for the same field.
    const clientIssues = {
      ...(parsed.success
        ? {}
        : toIssueMap(
            parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
          )),
      ...extraIssues,
    };
    if (Object.keys(clientIssues).length > 0) {
      setIssues(clientIssues);
      toast.error('Kaydedilemedi: işaretli alanları düzeltin.');
      revealFirstInvalid();
      return;
    }
    setIssues({});
    startTransition(async () => {
      const result = await saveSettings(guildId, section, value);
      if (result.ok) {
        toast.success(result.changed ? 'Ayarlar kaydedildi.' : 'Kaydedilecek değişiklik yok.');
        router.refresh();
      } else {
        setIssues(toIssueMap(result.issues ?? []));
        toast.error(result.error);
        if (result.issues?.length) revealFirstInvalid();
      }
    });
  }

  return { save, pending, issues, setIssues };
}
