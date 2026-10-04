import { getGuild, listSettingsAudit } from '@discordplus/db';
import { expect, test } from '@playwright/test';
import { listenForEvents, openDatabase } from './db';
import { guilds, users } from './fixtures.mjs';
import { loginAs } from './helpers';

const base = `/panel/${guilds.owned.id}`;

test.beforeEach(async ({ context }) => {
  await loginAs(context, 'alice');
});

test('moderation settings are saved, audited and announced to the bot', async ({ page }) => {
  const listener = await listenForEvents();
  const database = openDatabase();
  try {
    await page.goto(`${base}/moderasyon`);
    await expect(page.getByRole('heading', { name: 'Moderasyon', level: 1 })).toBeVisible();

    const dm = page.getByRole('switch', { name: 'Kullanıcıya özel mesaj gönder' });
    await expect(dm).toBeChecked();
    await dm.click();

    await page.getByRole('combobox', { name: 'Uyarıların geçerlilik süresi' }).click();
    await page.getByRole('option', { name: '30 gün' }).click();

    await page.getByRole('button', { name: 'Eşik ekle' }).click();
    await page.getByRole('spinbutton', { name: '1. eşik: uyarı sayısı' }).fill('3');
    await page.getByRole('textbox', { name: '1. eşik: süre' }).fill('2sa');

    await page.getByRole('button', { name: 'Kaydet' }).click();
    await expect(page.getByText('Ayarlar kaydedildi.')).toBeVisible();

    await page.reload();
    await expect(dm).not.toBeChecked();
    await expect(page.getByRole('combobox', { name: 'Uyarıların geçerlilik süresi' })).toHaveText(
      '30 gün',
    );
    await expect(page.getByRole('textbox', { name: '1. eşik: süre' })).toHaveValue('2sa');

    const row = await getGuild(database.db, guilds.owned.id);
    expect(row?.moderation).toEqual({
      dmOnAction: false,
      warnExpiryDays: 30,
      thresholds: [{ count: 3, action: 'timeout', durationMs: 7_200_000 }],
    });

    const audit = await listSettingsAudit(database.db, guilds.owned.id);
    expect(audit[0]).toMatchObject({
      section: 'moderation',
      actorId: users.alice.discordId,
      actorName: users.alice.name,
    });

    await expect
      .poll(() => listener.events)
      .toContainEqual({
        type: 'settings_updated',
        guildId: guilds.owned.id,
        section: 'moderation',
        actorId: users.alice.discordId,
        actorName: users.alice.name,
      });
  } finally {
    await listener.stop();
    await database.close();
  }
});

test('invalid thresholds are explained and not saved', async ({ page }) => {
  await page.goto(`/panel/${guilds.manager.id}/moderasyon`);
  await page.getByRole('button', { name: 'Eşik ekle' }).click();
  await page.getByRole('textbox', { name: '1. eşik: süre' }).fill('');
  await page.getByRole('button', { name: 'Kaydet' }).click();
  await expect(page.getByText('Susturma için süre gerekli')).toBeVisible();

  await page.getByRole('textbox', { name: '1. eşik: süre' }).fill('yarın');
  await page.getByRole('button', { name: 'Kaydet' }).click();
  await expect(page.getByText('Geçersiz süre (ör. 30dk, 2sa, 1g)')).toBeVisible();

  const database = openDatabase();
  try {
    const row = await getGuild(database.db, guilds.manager.id);
    expect(row?.moderation).toEqual({});
  } finally {
    await database.close();
  }
});

test('the moderation log channel is chosen from the server channels', async ({ page }) => {
  await page.goto(`${base}/loglar`);
  const select = page.getByRole('combobox', { name: 'Moderasyon logu' });
  await expect(select).toHaveText('Kapalı');
  await select.click();
  // Voice channels cannot receive logs.
  await expect(page.getByRole('option', { name: 'Sesli Sohbet' })).toHaveCount(0);
  await page.getByRole('option', { name: 'mod-log' }).click();
  await page.getByRole('button', { name: 'Kaydet' }).click();
  await expect(page.getByText('Ayarlar kaydedildi.')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Moderasyon logu' })).toHaveText('mod-log');
});
