import { getCase } from '@discordplus/db';
import { expect, test } from '@playwright/test';
import { listenForEvents, openDatabase } from './db';
import { guilds } from './fixtures.mjs';
import { loginAs } from './helpers';

const base = `/panel/${guilds.owned.id}/vakalar`;

test.beforeEach(async ({ context }) => {
  await loginAs(context, 'alice');
});

test('lists cases and filters them', async ({ page }) => {
  await page.goto(base);
  for (const n of [1, 2, 3]) await expect(page.getByTestId(`case-${n}`)).toBeVisible();

  await page.getByLabel('Tür').selectOption('ban');
  await page.getByRole('button', { name: 'Filtrele' }).click();
  await expect(page).toHaveURL(`${base}?tur=ban&kullanici=`);
  await expect(page.getByTestId('case-3')).toBeVisible();
  await expect(page.getByTestId('case-1')).toHaveCount(0);

  await page.goto(`${base}?kullanici=500000000000000001`);
  await expect(page.getByTestId('case-1')).toBeVisible();
  await expect(page.getByTestId('case-2')).toBeVisible();
  await expect(page.getByTestId('case-3')).toHaveCount(0);
});

test('editing a reason updates the case and tells the bot', async ({ page }) => {
  const listener = await listenForEvents();
  const database = openDatabase();
  try {
    await page.goto(base);
    await page.getByRole('link', { name: '#1', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Vaka #1 · Uyarı' })).toBeVisible();

    await page.getByLabel('Sebep').fill('Reklam ve spam');
    await page.getByRole('button', { name: 'Sebebi kaydet' }).click();
    await expect(page.getByText('Sebep güncellendi.')).toBeVisible();

    const row = await getCase(database.db, guilds.owned.id, 1);
    expect(row?.reason).toBe('Reklam ve spam');
    await expect
      .poll(() => listener.events)
      .toContainEqual({
        type: 'case_updated',
        guildId: guilds.owned.id,
        caseId: row!.id,
      });
  } finally {
    await listener.stop();
    await database.close();
  }
});

test('deleting a case hides it from the list', async ({ page }) => {
  await page.goto(`${base}/2`);
  await page.getByRole('button', { name: 'Vakayı sil' }).click();
  await page.getByRole('button', { name: 'Sil', exact: true }).click();
  await expect(page).toHaveURL(base);
  await expect(page.getByTestId('case-2')).toHaveCount(0);

  await page.goto(`${base}/2`);
  await expect(page.getByText('Silindi', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Vakayı sil' })).toHaveCount(0);
});

test('unknown cases are not found', async ({ page }) => {
  const response = await page.goto(`${base}/999`);
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Kayıt bulunamadı' })).toBeVisible();
});

test('overview shows statistics and recent cases', async ({ page }) => {
  await page.goto(`/panel/${guilds.owned.id}`);
  await expect(page.getByText('Son 7 gün')).toBeVisible();
  await expect(page.getByRole('link', { name: /#3.*raider/ })).toBeVisible();
});
