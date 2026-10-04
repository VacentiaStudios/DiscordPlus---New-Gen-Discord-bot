import { getGuild } from '@discordplus/db';
import { expect, test } from '@playwright/test';
import { listenForEvents, openDatabase } from './db';
import { guilds, users } from './fixtures.mjs';
import { loginAs } from './helpers';

const base = `/panel/${guilds.owned.id}`;
const CATEGORY_GENERAL = '400000000000000001';
const MOD_LOG = '400000000000000003';

test.beforeEach(async ({ context }) => {
  await loginAs(context, 'alice');
});

test('every log category can be routed to a channel', async ({ page }) => {
  await page.goto(`${base}/loglar`);
  for (const name of ['Moderasyon logu', 'Mesaj logu', 'Üye logu', 'Sunucu logu', 'Ses logu']) {
    await expect(page.getByRole('combobox', { name })).toHaveText('Kapalı');
  }
});

test('warns when the bot cannot use the chosen log channel', async ({ page }) => {
  await page.goto(`${base}/loglar`);
  const messageLog = page.getByRole('combobox', { name: 'Mesaj logu' });

  // @everyone, and so the bot, cannot send messages in #kurallar.
  await messageLog.click();
  await page.getByRole('option', { name: 'kurallar' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Mesaj Gönder' })).toHaveText(
    'Botun bu kanalda Mesaj Gönder yetkisi yok. Bu kategorinin logları gönderilemez.',
  );

  // The bot cannot upload files in #sohbet, which only matters for the message log.
  await messageLog.click();
  await page.getByRole('option', { name: 'sohbet' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Dosya Ekle' })).toHaveText(
    'Botun bu kanalda Dosya Ekle yetkisi yok. Toplu silme dökümleri dosya olarak eklenemez.',
  );
  await page.getByRole('combobox', { name: 'Üye logu' }).click();
  await page.getByRole('option', { name: 'sohbet' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'yetkisi yok' })).toHaveCount(1);

  await messageLog.click();
  await page.getByRole('option', { name: 'mod-log' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'yetkisi yok' })).toHaveCount(0);
});

test('log settings are saved and announced to the bot', async ({ page }) => {
  const listener = await listenForEvents();
  const database = openDatabase();
  try {
    await page.goto(`${base}/loglar`);

    for (const name of ['Mesaj logu', 'Ses logu']) {
      await page.getByRole('combobox', { name }).click();
      await page.getByRole('option', { name: 'mod-log' }).click();
    }

    const ignored = page.getByRole('combobox', { name: 'Yoksayılan kanallar' });
    await expect(page.getByText('Yoksayılan kanal yok.')).toBeVisible();
    await ignored.click();
    // Voice channels and whole categories can be ignored too.
    await page.getByRole('option', { name: 'Genel (tüm kategori)' }).click();
    await ignored.click();
    await page.getByRole('option', { name: 'Sesli Sohbet' }).click();
    await ignored.click();
    await page.getByRole('option', { name: 'kurallar' }).click();
    await page.getByRole('button', { name: 'Sesli Sohbet kanalını listeden çıkar' }).click();
    await expect(page.getByRole('button', { name: /kanalını listeden çıkar$/ })).toHaveCount(2);

    const bots = page.getByRole('switch', { name: 'Botları yoksay' });
    await expect(bots).toBeChecked();
    await bots.click();

    await page.getByRole('button', { name: 'Kaydet' }).click();
    await expect(page.getByText('Ayarlar kaydedildi.')).toBeVisible();

    await page.reload();
    await expect(page.getByRole('combobox', { name: 'Ses logu' })).toHaveText('mod-log');
    await expect(page.getByRole('button', { name: 'Genel kanalını listeden çıkar' })).toBeVisible();
    await expect(bots).not.toBeChecked();

    const row = await getGuild(database.db, guilds.owned.id);
    expect(row?.logging).toMatchObject({
      channels: { message: MOD_LOG, voice: MOD_LOG, member: null, server: null },
      ignoredChannelIds: [CATEGORY_GENERAL, '400000000000000005'],
      ignoreBots: false,
    });

    await expect
      .poll(() => listener.events)
      .toContainEqual({
        type: 'settings_updated',
        guildId: guilds.owned.id,
        section: 'logging',
        actorId: users.alice.discordId,
        actorName: users.alice.name,
      });
  } finally {
    await listener.stop();
    await database.close();
  }
});

test('without role data the form still works, just without warnings', async ({ page }) => {
  // The mock API has no roles for this guild, so permissions cannot be computed.
  await page.goto(`/panel/${guilds.manager.id}/loglar`);
  await page.getByRole('combobox', { name: 'Mesaj logu' }).click();
  await page.getByRole('option', { name: 'genel' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'yetkisi yok' })).toHaveCount(0);
});
