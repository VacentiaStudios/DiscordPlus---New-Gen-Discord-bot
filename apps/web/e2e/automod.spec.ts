import { getGuild } from '@discordplus/db';
import { defaultSettings } from '@discordplus/shared';
import { expect, test, type Page } from '@playwright/test';
import { listenForEvents, openDatabase, resetSettings } from './db';
import { guilds, users } from './fixtures.mjs';
import { loginAs } from './helpers';

const base = `/panel/${guilds.owned.id}/automod`;
const FILTERS = [
  'Spam',
  'Tekrar eden mesaj',
  'Küfür',
  'Davet linki',
  'Link',
  'Büyük harf',
  'Toplu etiket',
];
const MODERATOR_ROLE = '600000000000000001';
const CATEGORY_GENERAL = '400000000000000001';

const filterSwitch = (page: Page, name: string) => page.getByRole('switch', { name, exact: true });

async function storedAutomod() {
  const database = openDatabase();
  try {
    return (await getGuild(database.db, guilds.owned.id))?.automod;
  } finally {
    await database.close();
  }
}

test.beforeEach(async ({ context }) => {
  await resetSettings(guilds.owned.id, 'automod');
  await loginAs(context, 'alice');
});

test('filters start off and the recommended preset turns them on', async ({ page }) => {
  const listener = await listenForEvents();
  try {
    await page.goto(base);
    for (const name of FILTERS) await expect(filterSwitch(page, name)).not.toBeChecked();

    await page.getByRole('button', { name: 'Önerilen ayarları uygula' }).click();
    for (const name of FILTERS.filter((n) => n !== 'Link')) {
      await expect(filterSwitch(page, name)).toBeChecked();
    }
    await expect(filterSwitch(page, 'Link')).not.toBeChecked();
    await expect(page.getByRole('textbox', { name: 'Spam: süre' })).toHaveValue('10dk');

    await page.getByRole('button', { name: 'Kaydet' }).click();
    await expect(page.getByText('Ayarlar kaydedildi.')).toBeVisible();
    expect(await storedAutomod()).toMatchObject({
      spam: { enabled: true, action: 'timeout', durationMs: 600_000 },
      profanity: { enabled: true, action: 'warn', useDefaultList: true },
      links: { enabled: false },
    });
    await expect
      .poll(() => listener.events)
      .toContainEqual({
        type: 'settings_updated',
        guildId: guilds.owned.id,
        section: 'automod',
        actorId: users.alice.discordId,
        actorName: users.alice.name,
      });

    await page.goto(`/panel/${guilds.owned.id}`);
    await expect(page.getByText('6 filtre açık')).toBeVisible();
  } finally {
    await listener.stop();
  }
});

test('actions, word lists and exemptions are saved', async ({ page }) => {
  await page.goto(base);
  await filterSwitch(page, 'Küfür').click();
  await page.getByRole('combobox', { name: 'Küfür: eylem' }).click();
  await page.getByRole('option', { name: 'Sil ve sustur' }).click();
  const duration = page.getByRole('textbox', { name: 'Küfür: süre' });
  await expect(duration).toHaveValue('10dk');
  await duration.fill('30dk');
  await page.getByRole('textbox', { name: 'Ek kelimeler' }).fill('salak\naptal*\nsalak');
  await expect(page.getByText('2 kayıt')).toBeVisible();
  await page.getByRole('textbox', { name: 'İzin verilen kelimeler' }).fill('amk');

  await page.getByRole('switch', { name: 'Moderatörleri muaf tut' }).click();
  await page.getByRole('combobox', { name: 'Muaf roller' }).click();
  // @everyone cannot be exempted.
  await expect(page.getByRole('option', { name: '@everyone' })).toHaveCount(0);
  await page.getByRole('option', { name: '@Moderatör' }).click();
  await page.getByRole('combobox', { name: 'Muaf kanallar' }).click();
  await page.getByRole('option', { name: 'Genel (tüm kategori)' }).click();

  await page.getByRole('button', { name: 'Kaydet' }).click();
  await expect(page.getByText('Ayarlar kaydedildi.')).toBeVisible();

  await page.reload();
  await expect(duration).toHaveValue('30dk');
  await expect(
    page.getByRole('button', { name: '@Moderatör rolünü listeden çıkar' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Genel kanalını listeden çıkar' })).toBeVisible();
  expect(await storedAutomod()).toMatchObject({
    profanity: {
      enabled: true,
      action: 'timeout',
      durationMs: 1_800_000,
      words: ['salak', 'aptal*'],
      allowedWords: ['amk'],
    },
    exemptModerators: false,
    exemptRoleIds: [MODERATOR_ROLE],
    exemptChannelIds: [CATEGORY_GENERAL],
  });

  await filterSwitch(page, 'Küfür').click();
  await page.getByRole('button', { name: 'Kaydet' }).click();
  await expect(page.getByText('Ayarlar kaydedildi.')).toBeVisible();
  expect(await storedAutomod()).toMatchObject({ profanity: { enabled: false } });
});

test('invalid values are explained and not saved', async ({ page }) => {
  await page.goto(base);
  await filterSwitch(page, 'Spam').click();
  await page.getByRole('combobox', { name: 'Spam: eylem' }).click();
  await page.getByRole('option', { name: 'Sil ve sustur' }).click();
  await page.getByRole('textbox', { name: 'Spam: süre' }).fill('');
  await page.getByRole('spinbutton', { name: 'Mesaj sınırı' }).fill('100');
  await filterSwitch(page, 'Link').click();
  await page
    .getByRole('textbox', { name: 'İzin verilen siteler' })
    .fill('youtube.com\nhttps://kotu.example');

  await page.getByRole('button', { name: 'Kaydet' }).click();
  await expect(page.getByText('Susturma için süre gerekli')).toBeVisible();
  await expect(page.getByText('En fazla 30 olabilir')).toBeVisible();
  await expect(
    page.getByText('“https://kotu.example”: Geçersiz alan adı (ör. youtube.com)'),
  ).toBeVisible();
  expect(await storedAutomod()).toEqual(defaultSettings('automod'));
});
