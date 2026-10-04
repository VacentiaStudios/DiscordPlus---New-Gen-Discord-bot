'use server';

import { deleteCase, notifyEvent, updateCaseReason } from '@discordplus/db';
import { revalidatePath } from 'next/cache';
import { getDb } from '../db';
import { requireGuildAccess } from '../guilds';

export type CaseActionResult = { ok: true } | { ok: false; error: string };

const MAX_REASON_LENGTH = 500;

export async function updateCaseReasonAction(
  guildId: string,
  caseNumber: number,
  reason: string,
): Promise<CaseActionResult> {
  await requireGuildAccess(guildId);
  const trimmed = reason.trim();
  if (trimmed.length > MAX_REASON_LENGTH) {
    return { ok: false, error: `Sebep en fazla ${MAX_REASON_LENGTH} karakter olabilir.` };
  }

  const db = getDb();
  const row = await updateCaseReason(db, guildId, caseNumber, trimmed || null);
  if (!row) return { ok: false, error: 'Vaka bulunamadı veya silinmiş.' };
  // The bot refreshes the case's mod-log message.
  await notifyEvent(db, { type: 'case_updated', guildId, caseId: row.id });
  revalidatePath(`/panel/${guildId}`, 'layout');
  return { ok: true };
}

export async function deleteCaseAction(
  guildId: string,
  caseNumber: number,
): Promise<CaseActionResult> {
  const { user } = await requireGuildAccess(guildId);
  const db = getDb();
  const row = await deleteCase(db, guildId, caseNumber, user.discordId);
  if (!row) return { ok: false, error: 'Vaka bulunamadı veya zaten silinmiş.' };
  await notifyEvent(db, { type: 'case_updated', guildId, caseId: row.id });
  revalidatePath(`/panel/${guildId}`, 'layout');
  return { ok: true };
}
